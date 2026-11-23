#!/usr/bin/env python3
"""Harvest the public-domain cover paintings of Standard Ebooks from GitHub for the Eye.

    python3 -I se_harvest.py slugs.txt out_dir [--workers 6] [--limit N]

slugs.txt: one Standard Ebooks URL path per line (author/title[/translator]) as the catalogue lists them.
For each: the repo is standardebooks/<path with / replaced by _>; reads src/epub/text/colophon.xhtml (the painting's title, year and
artist with the artist's Wikipedia link, as the colophon states them: "The cover page is adapted from <i>Title</i>, a painting
completed in <time>YEAR</time> by <a href=wiki>Artist</a>"), downloads images/cover.source.jpg when it is under 3 MB (the whole
painting as Standard Ebooks took it from Wikimedia Commons or a museum) else images/cover.jpg (the 1400x2100 cover crop), resizes
to at most 1000 px on the long side (JPEG quality 80) into out_dir/img/<slug>.jpg and writes out_dir/se_pool.json:
  [{slug, repo, book, book_author, title, year, y0, y1, artist, wiki, crop (true when the cover crop was used), w, h, bytes, colophon_url, img_url}]
Only raw.githubusercontent.com is read. Deterministic, resumable (skips slugs already in the JSON)."""
import sys, re, json, os, io, time, pathlib, concurrent.futures as cf, urllib.request, html
from PIL import Image
args = sys.argv[1:]
slugs_file, out_dir = args[0], pathlib.Path(args[1])
workers = int(args[args.index('--workers') + 1]) if '--workers' in args else 6
limit = int(args[args.index('--limit') + 1]) if '--limit' in args else None
(out_dir / 'img').mkdir(parents=True, exist_ok=True)
out_json = out_dir / 'se_pool.json'
rows = json.load(open(out_json, encoding='utf-8')) if out_json.exists() else []
done = {r['slug'] for r in rows}
RAW = 'https://raw.githubusercontent.com/standardebooks/{repo}/master/'
UA = {'User-Agent': 'subhasta-eye/1.0 (public-domain cover harvest)'}
def get(url, maxbytes=None, timeout=60):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        if maxbytes:
            cl = r.headers.get('Content-Length')
            if cl and int(cl) > maxbytes: return None, int(cl)
        return r.read(), int(r.headers.get('Content-Length') or 0)
def head_len(url):
    req = urllib.request.Request(url, headers=UA, method='HEAD')
    try:
        with urllib.request.urlopen(req, timeout=30) as r: return int(r.headers.get('Content-Length') or 0)
    except Exception: return None
def years(s):
    s = s.strip()
    m = re.findall(r'\d{3,4}', s)
    if not m: return None, None
    ys = [int(x) for x in m]
    if re.search(r'\bBCE?\b', s): ys = [-y for y in ys]
    return min(ys), max(ys)
def strip_tags(t): return html.unescape(re.sub(r'<[^>]+>', '', t)).strip()
def harvest(slug):
    repo = slug.strip('/').replace('/', '_')
    base = RAW.format(repo=repo)
    try:
        col, _ = get(base + 'src/epub/text/colophon.xhtml')
    except Exception as e:
        return {'slug': slug, 'repo': repo, 'error': f'colophon: {e}'}
    col = col.decode('utf-8', 'replace')
    m = re.search(r'cover page is adapted from\s*(?:<br/>)?\s*<i[^>]*>(.*?)</i>,?\s*(?:<br/>)?\s*(?:an? )?(painting|drawing|watercolou?r|illustration|print|woodcut|engraving|fresco|lithograph|mural|photograph|etching|pastel|artwork|work)[^<]*?(?:completed|painted|made|created|finished|produced)?\s*(?:in|around|circa|between)?\s*(?:<time[^>]*>)?([^<]*?)(?:</time>)?\s*(?:and\s*(?:<time[^>]*>)?([^<]*?)(?:</time>)?)?\s*by\s*(?:<br/>)?\s*(?:<a href="([^"]*)"[^>]*>)?([^<]+)(?:</a>)?', col, re.S | re.I)
    if not m:
        m2 = re.search(r'cover page is adapted from(.{0,600}?)(?:</p>|<br/>\s*</p>)', col, re.S | re.I)
        return {'slug': slug, 'repo': repo, 'error': 'colophon not parsed', 'raw': strip_tags(m2.group(1))[:300] if m2 else ''}
    title, kind, y_a, y_b, wiki, artist = strip_tags(m.group(1)), m.group(2).lower(), strip_tags(m.group(3) or ''), strip_tags(m.group(4) or ''), (m.group(5) or ''), strip_tags(m.group(6))
    y0, y1 = years(y_a + (' ' + y_b if y_b else ''))
    bm = re.search(r'<title>(.*?)</title>', col, re.S)
    book = strip_tags(bm.group(1)) if bm else repo
    # the image: the whole painting when it is under 3 MB, else the cover crop
    crop = False
    src_url = base + 'images/cover.source.jpg'
    n = head_len(src_url)
    data = None
    if n and n <= 3_000_000:
        try: data, _ = get(src_url, timeout=120)
        except Exception: data = None
    if data is None:
        crop = True; src_url = base + 'images/cover.jpg'
        try: data, _ = get(src_url, timeout=120)
        except Exception as e: return {'slug': slug, 'repo': repo, 'error': f'image: {e}', 'title': title, 'artist': artist}
    try:
        im = Image.open(io.BytesIO(data)); im.load()
        if im.mode not in ('RGB', 'L'): im = im.convert('RGB')
        w, h = im.size
        if max(w, h) > 1000:
            f = 1000 / max(w, h); im = im.resize((max(1, round(w * f)), max(1, round(h * f))), Image.LANCZOS)
        out = out_dir / 'img' / (repo + '.jpg')
        im.save(out, 'JPEG', quality=80, optimize=True, progressive=True)
        return {'slug': slug, 'repo': repo, 'book': book, 'title': title, 'kind': kind, 'year': (y_a + (('–' + y_b) if y_b else '')).strip(), 'y0': y0, 'y1': y1, 'artist': artist, 'wiki': wiki, 'crop': crop,
                'w': im.size[0], 'h': im.size[1], 'bytes': out.stat().st_size, 'colophon_url': base + 'src/epub/text/colophon.xhtml', 'img_url': src_url}
    except Exception as e:
        return {'slug': slug, 'repo': repo, 'error': f'decode: {e}', 'title': title, 'artist': artist}
slugs = [l.strip() for l in open(slugs_file, encoding='utf-8') if l.strip() and not l.startswith('#')]
todo = [s for s in slugs if s not in done]
if limit: todo = todo[:limit]
print(f'{len(slugs)} slugs, {len(done)} done, {len(todo)} to do', flush=True)
t0 = time.time(); n_ok = n_err = 0
with cf.ThreadPoolExecutor(max_workers=workers) as ex:
    for i, r in enumerate(ex.map(harvest, todo), 1):
        rows.append(r); done.add(r['slug'])
        if 'error' in r: n_err += 1
        else: n_ok += 1
        if i % 20 == 0 or i == len(todo):
            json.dump(rows, open(out_json, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
            print(f'  {i}/{len(todo)}: {n_ok} ok, {n_err} errors, {time.time() - t0:.0f}s', flush=True)
json.dump(rows, open(out_json, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
ok = [r for r in rows if 'error' not in r]
print(f'done: {len(ok)} paintings, {sum(1 for r in rows if "error" in r)} errors; {sum(r["bytes"] for r in ok) / 1e6:.1f} MB of images')
