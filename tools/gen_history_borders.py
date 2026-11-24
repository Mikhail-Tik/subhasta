#!/usr/bin/env python3
"""Write data/hist/<year>.json (one snapshot of the world's political borders per chosen year) and data/hist/index.json from
aourednik/historical-basemaps (https://github.com/aourednik/historical-basemaps, GPL-3.0). Usage:
    python3 tools/gen_history_borders.py <historical-basemaps geojson dir> [--keep-unnamed]
For each wanted year the nearest available `world_<y>.geojson` / `world_bc<y>.geojson` is read. Every named feature becomes a polity:
{"n": name, "ll": [lat, lon] label point, "a": area in square degrees, "rings": [[x0, y0, dx1, dy1, …], …]} plus "k" (kind: the
TYPE/type column of the prehistoric files, e.g. "hunter-gatherers", "kingdom") and "s" (the power the region is subject to, only when it
differs from the name) where the source has them. Rings are Douglas–Peucker simplified at 0.35°, quantised to 0.01° and delta-encoded
as integers in hundredths of a degree, exactly as tools/gen_regions.py encodes lines, so glbDecode() in globe.js reads them; rings stay
closed (last point = first) and holes are kept as further rings (fill even-odd). A file over 60 KB (1492 with its 1,946 Native
American nations, 1600–1800 with the Aboriginal nations and the Holy Roman micro-states) has its smallest polities left out until it
fits, and records the area floor as "min_a": those polities are under about 1 square degree, invisible on the globe, whereas raising
the tolerance instead (MAX_TOL above TOL lets it rise in 0.1° steps first) turns every visible border into spikes — 1492 needed 1.05°
that way. Polities are sorted by area, largest first. Features with no NAME, SUBJECTO or PARTOF (Antarctica, unclaimed land) are left
out unless --keep-unnamed is given. Prints a table of year, polities and size at the end."""
import json, math, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
args = [a for a in sys.argv[1:] if not a.startswith('--')]
if not args: sys.exit('usage: python3 tools/gen_history_borders.py <historical-basemaps geojson dir> [--keep-unnamed]')
src = pathlib.Path(args[0])
keep_unnamed = '--keep-unnamed' in sys.argv
out_dir = root / 'data' / 'hist'
SRC_SHORT, SRC_URL, LICENCE = 'aourednik/historical-basemaps', 'https://github.com/aourednik/historical-basemaps', 'GPL-3.0'
WANTED = [-3000, -2000, -1000, -500, -323, -200, -1, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1279, 1300, 1400, 1492, 1500,
          1530, 1600, 1650, 1700, 1715, 1783, 1800, 1815, 1880, 1900, 1914, 1920, 1938, 1945, 1960, 1994, 2000, 2010]
TOL, STEP, MAX_KB, MIN_PTS = 0.35, 0.1, 60, 4
MAX_TOL = TOL   # e.g. 0.65 to let a file over MAX_KB raise its tolerance in STEP increments before its smallest polities are left out

def dp(pts, tol):
    if len(pts) < 3: return pts
    # iterative Douglas–Peucker (as in gen_regions.py)
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]; bx, by = pts[b]
        dx, dy = bx - ax, by - ay; L2 = dx * dx + dy * dy
        best, bi = -1.0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            if L2 == 0: d = math.hypot(px - ax, py - ay)
            else:
                t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / L2))
                d = math.hypot(px - (ax + t * dx), py - (ay + t * dy))
            if d > best: best, bi = d, i
        if best > tol and bi > 0:
            keep[bi] = True; stack.append((a, bi)); stack.append((bi, b))
    return [p for p, k in zip(pts, keep) if k]

def flat(pts):
    # integers in hundredths of a degree, delta-encoded after the first point: [x0, y0, dx1, dy1, …]
    out, px, py = [], 0, 0
    for i, (x, y) in enumerate(pts):
        X, Y = int(round(x * 100)), int(round(y * 100))
        if i == 0: out += [X, Y]
        else:
            if X == px and Y == py: continue
            out += [X - px, Y - py]
        px, py = X, Y
    return out

def signed_area(ring):
    # shoelace, in square degrees of longitude × latitude
    s = 0.0
    for i in range(len(ring) - 1):
        (x1, y1), (x2, y2) = ring[i], ring[i + 1]
        s += x1 * y2 - x2 * y1
    return s / 2

def centroid(ring):
    a = signed_area(ring)
    if abs(a) < 1e-9:
        xs = [p[0] for p in ring]; ys = [p[1] for p in ring]
        return sum(xs) / len(xs), sum(ys) / len(ys)
    cx = cy = 0.0
    for i in range(len(ring) - 1):
        (x1, y1), (x2, y2) = ring[i], ring[i + 1]
        w = x1 * y2 - x2 * y1
        cx += (x1 + x2) * w; cy += (y1 + y2) * w
    return cx / (6 * a), cy / (6 * a)

def inside(x, y, ring):
    # even-odd point-in-polygon test
    c = False
    for i in range(len(ring) - 1):
        (x1, y1), (x2, y2) = ring[i], ring[i + 1]
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1): c = not c
    return c

def label_point(ring):
    # the ring's centroid; when that falls outside the ring (a crescent, a horseshoe), the midpoint of the longest span of the ring
    # on the centroid's latitude instead, so the label still sits on the polity
    cx, cy = centroid(ring)
    if inside(cx, cy, ring): return cx, cy
    xs = []
    for i in range(len(ring) - 1):
        (x1, y1), (x2, y2) = ring[i], ring[i + 1]
        if (y1 > cy) != (y2 > cy): xs.append(x1 + (cy - y1) * (x2 - x1) / (y2 - y1))
    xs.sort()
    best = None
    for i in range(0, len(xs) - 1, 2):
        if best is None or xs[i + 1] - xs[i] > best[1] - best[0]: best = (xs[i], xs[i + 1])
    return ((best[0] + best[1]) / 2, cy) if best else (cx, cy)

def polygons_of(geom):
    if not geom: return []
    t, c = geom.get('type'), geom.get('coordinates')
    if t == 'Polygon': return [c]
    if t == 'MultiPolygon': return list(c)
    return []

def clean(v):
    s = ' '.join(str(v).split()) if v is not None else ''
    return s

def polity(f, tol):
    p = f.get('properties') or {}
    name = clean(p.get('NAME')) or clean(p.get('SUBJECTO')) or clean(p.get('PARTOF'))
    if not name and not keep_unnamed: return None
    rings, area, largest = [], 0.0, None
    for poly in polygons_of(f.get('geometry')):
        for j, r in enumerate(poly):
            pts = [(float(c[0]), float(c[1])) for c in r]
            if len(pts) < 4: continue
            if pts[0] != pts[-1]: pts.append(pts[0])      # keep every ring closed
            a = abs(signed_area(pts))
            s = dp(pts, tol)
            enc = flat(s)
            if len(enc) < 2 * MIN_PTS: continue
            rings.append(enc)
            if j == 0:
                area += a
                if largest is None or a > largest[0]: largest = (a, pts)
            else: area -= a                                # a hole takes its area away
    if not rings or largest is None: return None
    x, y = label_point(largest[1])
    row = {'n': name, 'll': [round(y, 1), round(x, 1)], 'a': round(max(area, 0.0), 1), 'rings': rings}
    kind = clean(p.get('TYPE') or p.get('type')).lower()
    if kind: row['k'] = kind[:40]
    subject = clean(p.get('SUBJECTO'))
    if subject and subject != name and not subject.isdigit(): row['s'] = subject
    return row

def dumps(doc): return json.dumps(doc, ensure_ascii=False, separators=(',', ':'))
def size_kb(js): return len(js.encode('utf-8')) / 1024

def build(year, tol):
    d = json.load(open(src / files[year], encoding='utf-8'))
    rows = [r for r in (polity(f, tol) for f in d['features']) if r]
    rows.sort(key=lambda r: -r['a'])
    doc = {'y': year, 'src': SRC_SHORT, 'tol': round(tol, 2), 'polities': rows}
    return doc, dumps(doc)

def cut(doc):
    # leave out the smallest polities until the file fits: the rows are largest first, so keep a prefix within the budget
    rows, budget = doc['polities'], MAX_KB * 1024 - len(dumps({**doc, 'polities': [], 'min_a': 99999.9}).encode('utf-8'))
    used, keep = 0, 0
    for r in rows:
        n = len(dumps(r).encode('utf-8')) + 1
        if used + n > budget: break
        used += n; keep += 1
    doc['min_a'] = rows[keep - 1]['a'] if keep else 0.0
    doc['polities'] = rows[:keep]
    return doc, dumps(doc), len(rows) - keep

# the available years: world_1500.geojson → 1500, world_bc500.geojson → -500
files = {}
for p in src.glob('world_*.geojson'):
    stem = p.stem[len('world_'):]
    try: files[-int(stem[2:]) if stem.startswith('bc') else int(stem)] = p.name
    except ValueError: continue
if not files: sys.exit(f'no world_*.geojson files in {src}')
out_dir.mkdir(parents=True, exist_ok=True)
years, table, notes = [], [], []
for want in WANTED:
    year = min(files, key=lambda y: (abs(y - want), y))
    if year != want: notes.append(f'{want} → nearest available year {year}')
    if year in years: notes.append(f'{want} → {year} already written; skipped'); continue
    tol = TOL
    doc, js = build(year, tol)
    while size_kb(js) > MAX_KB and tol + STEP <= MAX_TOL + 1e-9:
        tol = round(tol + STEP, 2)
        doc, js = build(year, tol)
    if tol != TOL: notes.append(f'{year}: tolerance raised to {tol}° to fit {MAX_KB} KB ({size_kb(js):.1f} KB)')
    if size_kb(js) > MAX_KB:
        before = size_kb(js)
        doc, js, dropped = cut(doc)
        notes.append(f'{year}: {before:.1f} KB at {tol}°; the {dropped} smallest polities (area < {doc["min_a"]} sq-deg) left out → {size_kb(js):.1f} KB')
    (out_dir / f'{year}.json').write_text(js, encoding='utf-8')
    years.append(year)
    table.append((year, files[year], len(doc['polities']), sum(len(r['rings']) for r in doc['polities']), sum(len(e) // 2 for r in doc['polities'] for e in r['rings']), tol, size_kb(js)))
index = {'years': years, 'licence': LICENCE, 'src': SRC_URL}
(out_dir / 'index.json').write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f"{'year':>6}  {'file':<24}{'polities':>9}{'rings':>7}{'points':>8}{'tol':>6}{'KB':>8}")
for year, fn, n, nr, npts, tol, kb in table: print(f'{year:>6}  {fn:<24}{n:>9}{nr:>7}{npts:>8}{tol:>6.2f}{kb:>8.1f}')
print(f"wrote {len(years)} files to data/hist/ ({sum(t[-1] for t in table):.0f} KB) and data/hist/index.json")
for n in notes: print('  note:', n)
