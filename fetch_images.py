#!/usr/bin/env python3
# fetch_images.py — download the public-domain pictures listed in images_manifest.py into data/raw_img, write the
# page-size JPEG (max 1600 px) to build/img/<id>.jpg and the thumbnail (max 480 px) to build/img/t/<id>.jpg, and
# merge each picture's record (artist, title, year, collection, size, focal point, average colour, source repo)
# into data/images_meta.json. Needs Pillow and network access to raw.githubusercontent.com.
import os, sys, json, subprocess, concurrent.futures as cf
from PIL import Image, ImageOps, ImageStat
ROOT = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, ROOT)
from images_manifest import IMAGES
RAW = f'{ROOT}/data/raw_img'; OUT = f'{ROOT}/build/img'; THUMB = f'{ROOT}/build/img/t'
os.makedirs(RAW, exist_ok=True); os.makedirs(OUT, exist_ok=True); os.makedirs(THUMB, exist_ok=True)
def fetch(e):
    id_, url = e[0], e[5]
    dst = f'{RAW}/{id_}.bin'
    if not os.path.exists(dst) or os.path.getsize(dst) < 20000:
        r = subprocess.run(['curl', '-sS', '-m', '120', '-L', '-o', dst, url], capture_output=True, text=True)
        if r.returncode != 0: return (id_, 'curl fail ' + r.stderr[:80])
    try:
        im = Image.open(dst); im.load()
    except Exception as ex:
        return (id_, 'decode fail ' + str(ex)[:60])
    im = ImageOps.exif_transpose(im).convert('RGB')
    w, h = im.size
    scale = min(1.0, 1600 / max(w, h))
    big = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS) if scale < 1 else im
    big.save(f'{OUT}/{id_}.jpg', 'JPEG', quality=82, optimize=True, progressive=True)
    ts = min(1.0, 480 / max(w, h)); th = im.resize((round(w * ts), round(h * ts)), Image.LANCZOS) if ts < 1 else im
    th.save(f'{THUMB}/{id_}.jpg', 'JPEG', quality=78, optimize=True)
    small = im.resize((32, 32)); st = ImageStat.Stat(small); avg = tuple(int(x) for x in st.mean[:3])
    # dominant-ish: median of darker pixels for a background tone
    return (id_, 'ok', big.size, os.path.getsize(f'{OUT}/{id_}.jpg'), '#%02x%02x%02x' % avg)
with cf.ThreadPoolExecutor(8) as ex:
    res = list(ex.map(fetch, IMAGES))
ok = [r for r in res if r[1] == 'ok']; bad = [r for r in res if r[1] != 'ok']
print('ok', len(ok), 'bad', len(bad)); print(bad)
# Merge into the existing registry: an entry that fails to fetch keeps its previous record (the JPEGs are already in
# build/img and published in the artifact); an id that is in the registry but no longer in the manifest is an error,
# because the app may still reference it.
meta_path = f'{ROOT}/data/images_meta.json'
meta = json.load(open(meta_path, encoding='utf-8')) if os.path.exists(meta_path) else {}
manifest_ids = {e[0] for e in IMAGES}
missing = sorted(k for k in meta if k not in manifest_ids)
if missing:
    sys.exit(f'images_manifest.py no longer lists {missing}, which are in data/images_meta.json; remove them from the data (tools/lint_data.js shows the references) before deleting them from the registry')
for r in ok:
    e = next(x for x in IMAGES if x[0] == r[0])
    meta[r[0]] = {'a': e[1], 't': e[2], 'y': e[3], 'c': e[4], 'w': r[2][0], 'h': r[2][1], 'fp': e[6], 'avg': r[4], 'src': e[5].split('/')[3] + '/' + e[5].split('/')[4]}
for r in bad:
    if r[0] not in meta:
        print('new image not fetched and not in the registry:', r)
meta = dict(sorted(meta.items(), key=lambda kv: [e[0] for e in IMAGES].index(kv[0]) if kv[0] in manifest_ids else 1e9))
json.dump(meta, open(meta_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
tot = sum(os.path.getsize(f'{OUT}/{k}.jpg') for k in meta); tt = sum(os.path.getsize(f'{THUMB}/{k}.jpg') for k in meta)
print('full MB', round(tot / 1e6, 1), 'thumbs MB', round(tt / 1e6, 1))
