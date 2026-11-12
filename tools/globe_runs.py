#!/usr/bin/env python3
"""tools/globe_runs.py — the engraved plate for the globes (src/world.js, src/globe.js), v26.

    python3 tools/globe_runs.py                  rewrite src/data_globe.js from the cached Natural Earth file
    python3 tools/globe_runs.py --spacing 0.7    the latitude step of the hatching, in degrees (default 0.7)
    python3 tools/globe_runs.py --tol 0.12       the border simplification tolerance, in degrees (default 0.12)
    python3 tools/globe_runs.py --check          regenerate in memory and exit 1 if src/data_globe.js differs
    python3 tools/globe_runs.py --fetch          download the GeoJSON again even if the cache exists

Standard library only, self-contained. Reads data/raw_geo/ne_110m_admin_0_countries.geojson (Natural Earth 110m admin-0, public
domain; downloaded by --fetch, or earlier by tools/globe_dots.py, the v23–v25 dot-matrix tool, which stays in git but is no longer run).

Since v23 the globes drew the land as a dot matrix (tools/globe_dots.py). v26 draws it as an engraved plate: the land is
hatched along the parallels, like a copperplate map, with the country borders as hairlines over it. This tool writes the
two things the renderer needs:

  GLOBE_COUNTRIES  ['United States of America', …]   Natural Earth ADMIN names, so COUNTRY_SHARE[name] keeps working
  GLOBE_RUNS       [[lat, lon0, lon1, ci, lon0, lon1, ci, …], …]
                   one row per parallel, `spacing` degrees apart; after the latitude, triples of (west, east, country
                   index): the stretches of that parallel that cross land, found by scanning every country ring's edges
                   (even–odd parity over all its rings, so holes count). Longitudes to one decimal.
  GLOBE_BORDERS    [[lon, lat, lon, lat, …], …]   every ring of every country, simplified (Douglas–Peucker, `tol`), one
                   decimal, as a flat list per ring. Drawn as hairlines; the coastlines and the land borders alike.
  GLOBE_META       {source, url, generated, spacing, tol, rows, runs, borders, points, countries}

Deterministic for a given spacing, tolerance and input file.
"""
import argparse
import datetime
import json
import pathlib
import sys

import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / 'data' / 'raw_geo'
RAW = RAW_DIR / 'ne_110m_admin_0_countries.geojson'
URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'
NAME_KEY = 'ADMIN'          # the long name: every COUNTRY_SHARE key in data_atlas.js matches it
OUT = ROOT / 'src' / 'data_globe.js'


def fetch(force=False):
    """Download the Natural Earth GeoJSON into data/raw_geo/ unless it is cached (the same cache tools/globe_dots.py used)."""
    if RAW.exists() and not force:
        return
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    print(f'downloading {URL}', file=sys.stderr)
    with urllib.request.urlopen(URL, timeout=120) as r:
        data = r.read()
    if not data.startswith(b'{'):
        raise SystemExit('the download does not look like GeoJSON')
    RAW.write_bytes(data)
    print(f'cached {len(data) // 1024} KB at {RAW.relative_to(ROOT)}', file=sys.stderr)


def rings_of(geometry):
    """Yield every ring (outer and holes alike) of a Polygon or MultiPolygon as a list of [lon, lat]."""
    polys = geometry['coordinates'] if geometry['type'] == 'MultiPolygon' else [geometry['coordinates']]
    for poly in polys:
        for ring in poly:
            yield ring


def crossings(ring, lat):
    """The longitudes where the parallel `lat` crosses this ring's edges (half-open rule, so a vertex counts once)."""
    out = []
    n = len(ring)
    for i in range(n - 1):
        x1, y1 = ring[i][0], ring[i][1]
        x2, y2 = ring[i + 1][0], ring[i + 1][1]
        if (y1 > lat) != (y2 > lat):
            out.append(x1 + (lat - y1) * (x2 - x1) / (y2 - y1))
    return out


def runs_for(countries, spacing):
    rows = []
    n = int(round(180 / spacing))
    for k in range(n):
        lat = -90 + (k + 0.5) * spacing
        row = [round(lat, 2)]
        for ci, (name, rings, box) in enumerate(countries):
            if not (box[1] <= lat <= box[3]):
                continue
            xs = []
            for ring in rings:
                xs.extend(crossings(ring, lat))
            if len(xs) < 2:
                continue
            xs.sort()
            for a, b in zip(xs[0::2], xs[1::2]):
                a = max(-180.0, a)
                b = min(180.0, b)
                if b - a < 0.05:
                    continue
                row.extend([round(a, 1), round(b, 1), ci])
        if len(row) > 1:
            rows.append(row)
    return rows


def simplify(points, tol):
    """Douglas–Peucker on [lon, lat] points (planar, good enough for hairlines at 110m)."""
    if len(points) < 3:
        return points
    first, last = points[0], points[-1]
    dx, dy = last[0] - first[0], last[1] - first[1]
    norm = (dx * dx + dy * dy) ** 0.5
    best, idx = 0.0, 0
    for i in range(1, len(points) - 1):
        px, py = points[i][0] - first[0], points[i][1] - first[1]
        d = abs(px * dy - py * dx) / norm if norm else (px * px + py * py) ** 0.5
        if d > best:
            best, idx = d, i
    if best > tol:
        left = simplify(points[:idx + 1], tol)
        right = simplify(points[idx:], tol)
        return left[:-1] + right
    return [first, last]


def borders_for(countries, tol):
    out = []
    for name, rings, box in countries:
        for ring in rings:
            s = simplify(ring, tol)
            if len(s) < 4:
                continue
            flat = []
            for p in s:
                flat.extend([round(p[0], 1), round(p[1], 1)])
            out.append(flat)
    return out


def build(spacing, tol):
    gj = json.loads(RAW.read_text(encoding='utf-8'))
    countries = []
    for f in gj['features']:
        name = f['properties'][NAME_KEY]
        rings = [ring for ring in rings_of(f['geometry'])]
        xs = [p[0] for r in rings for p in r]
        ys = [p[1] for r in rings for p in r]
        countries.append((name, rings, (min(xs), min(ys), max(xs), max(ys))))
    countries.sort(key=lambda c: c[0])
    rows = runs_for(countries, spacing)
    borders = borders_for(countries, tol)
    meta = {
        'source': 'Natural Earth 1:110m admin-0 countries, version 5 (public domain), via the nvkelso/natural-earth-vector repository',
        'url': URL, 'generated': datetime.date.today().isoformat(), 'spacing': spacing, 'tol': tol,
        'rows': len(rows), 'runs': sum((len(r) - 1) // 3 for r in rows), 'borders': len(borders),
        'points': sum(len(b) // 2 for b in borders), 'countries': len(countries)}
    names = [c[0] for c in countries]
    js = ['// ---------- THE GLOBE’S PLATE: the land hatched along the parallels, the borders as hairlines ----------',
          '// Generated by tools/globe_runs.py from Natural Earth 110m (public domain); do not edit by hand. GLOBE_RUNS: one row per',
          f'// parallel ({spacing}° apart): [lat, west, east, countryIndex, …]. GLOBE_BORDERS: every ring simplified to {tol}°, [lon, lat, …].',
          'const GLOBE_COUNTRIES=' + json.dumps(names, ensure_ascii=False, separators=(',', ':')).replace('"', "'") + ';',
          'const GLOBE_RUNS=[']
    js.extend(json.dumps(r, separators=(',', ':')) + ',' for r in rows)
    js.append('];')
    js.append('const GLOBE_BORDERS=[')
    js.extend(json.dumps(b, separators=(',', ':')) + ',' for b in borders)
    js.append('];')
    js.append('const GLOBE_META=' + json.dumps(meta, ensure_ascii=False) + ';')
    return '\n'.join(js) + '\n', meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--spacing', type=float, default=0.7)
    ap.add_argument('--tol', type=float, default=0.12)
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--fetch', action='store_true')
    a = ap.parse_args()
    fetch(a.fetch)
    text, meta = build(a.spacing, a.tol)
    if a.check:
        cur = OUT.read_text(encoding='utf-8') if OUT.exists() else ''
        same = cur.split('\n')[3:] == text.split('\n')[3:]   # ignore the generated date in META? it is at the end; compare bodies
        same = cur.replace(cur[cur.find('"generated"'):cur.find('"spacing"')] if '"generated"' in cur else '', '') == text.replace(text[text.find('"generated"'):text.find('"spacing"')], '')
        print('up to date' if same else 'differs')
        sys.exit(0 if same else 1)
    OUT.write_text(text, encoding='utf-8')
    print(f'wrote {OUT.relative_to(ROOT)}: {meta["rows"]} rows, {meta["runs"]} runs, {meta["borders"]} borders with {meta["points"]} points, {len(text) // 1024} KB')


if __name__ == '__main__':
    main()
