#!/usr/bin/env python3
"""tools/globe_dots.py — the dot-matrix land mask for the Atlas globe (src/globe.js).

    python3 tools/globe_dots.py                 rewrite src/data_globe.js from the cached Natural Earth file
    python3 tools/globe_dots.py --spacing 2.4   coarser grid (degrees between latitude rows; default 2.0)
    python3 tools/globe_dots.py --check         regenerate in memory and exit 1 if src/data_globe.js differs
    python3 tools/globe_dots.py --fetch         download the GeoJSON again even if the cache exists

Standard library only. The first run downloads Natural Earth 110m admin-0 countries (public domain) as GeoJSON
from the nvkelso/natural-earth-vector repository on GitHub into data/raw_geo/ (about 820 KB, kept out of git);
later runs read the cache and need no network.

What it does:
  1. Samples the sphere on an equal-area grid: latitude rows `spacing` degrees apart, and along each row as many
     longitude samples as fit 360°·cos(lat)/spacing, so the dots sit as far apart near the poles as at the equator
     (a plain lon/lat grid would bunch at the poles and read as a smear on the globe).
  2. Tests every sample against every country polygon (ray casting over all rings, so holes count; MultiPolygons
     are handled ring by ring; the only ring that touches the antimeridian is Antarctica's, and a horizontal ray
     never straddles its edge along the pole) with a bounding-box pre-check per country.
  3. Adds one dot at the largest polygon's centroid for any country the grid missed (Cyprus, Jamaica, Luxembourg…),
     so small states still appear, and guarantees a dot at every hub in src/data_atlas.js (HUBS lon/lat), with the
     country found by point-in-polygon, or the nearest coastline within 150 km for a hub that the 110m outline
     leaves offshore (Hong Kong's harbour, Singapore).
  4. Writes src/data_globe.js:
       const GLOBE_COUNTRIES=['United States of America', …]   Natural Earth ADMIN names, so COUNTRY_SHARE[name] works
       const GLOBE_DOTS=[[lon,lat,ci],…]                          one decimal place; ci indexes GLOBE_COUNTRIES
       const GLOBE_META={source, url, generated, spacing, dots, countries, hubDots, missedDots}

Rerunnable and deterministic for a given spacing and input file: the output changes only when the data does.
"""
import argparse
import datetime
import json
import math
import pathlib
import re
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / 'data' / 'raw_geo'
RAW = RAW_DIR / 'ne_110m_admin_0_countries.geojson'
URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'
OUT = ROOT / 'src' / 'data_globe.js'
ATLAS = ROOT / 'src' / 'data_atlas.js'
NAME_KEY = 'ADMIN'          # the long name: every COUNTRY_SHARE key in data_atlas.js matches it
HUB_REACH_KM = 150.0        # an offshore hub takes the nearest country within this distance
EARTH_KM = 6371.0


# ---------------------------------------------------------------- geometry
def fetch(force=False):
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


def bbox(points):
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return min(xs), min(ys), max(xs), max(ys)


def in_ring(lon, lat, ring):
    """Ray casting: is (lon, lat) inside this ring?"""
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > lat) != (yj > lat):
            x = (xj - xi) * (lat - yi) / (yj - yi) + xi
            if lon < x:
                inside = not inside
        j = i
    return inside


class Country:
    __slots__ = ('name', 'rings', 'box', 'largest')

    def __init__(self, name, geometry):
        self.name = name
        self.rings = []
        for ring in rings_of(geometry):
            self.rings.append((bbox(ring), ring))
        self.box = bbox([p for _, ring in self.rings for p in ring])
        # the outer ring with the biggest (equal-area-corrected) footprint, for the centroid fallback
        polys = geometry['coordinates'] if geometry['type'] == 'MultiPolygon' else [geometry['coordinates']]
        self.largest = max((poly[0] for poly in polys), key=ring_area)

    def contains(self, lon, lat):
        x0, y0, x1, y1 = self.box
        if not (x0 <= lon <= x1 and y0 <= lat <= y1):
            return False
        inside = False
        for (bx0, by0, bx1, by1), ring in self.rings:
            if bx0 <= lon <= bx1 and by0 <= lat <= by1 and in_ring(lon, lat, ring):
                inside = not inside   # parity over outer rings and holes
        return inside


def ring_area(ring):
    """Shoelace area in square degrees, scaled by cos(mean latitude) so Greenland is not inflated."""
    a = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        a += x1 * y2 - x2 * y1
    mean_lat = sum(p[1] for p in ring) / len(ring)
    return abs(a) / 2 * max(0.05, math.cos(math.radians(mean_lat)))


def centroid(ring):
    a = cx = cy = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        f = x1 * y2 - x2 * y1
        a += f
        cx += (x1 + x2) * f
        cy += (y1 + y2) * f
    if abs(a) < 1e-12:
        return ring[0][0], ring[0][1]
    return cx / (3 * a), cy / (3 * a)


def km(lon1, lat1, lon2, lat2):
    """Great-circle distance."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_KM * math.asin(min(1.0, math.sqrt(h)))


# ----------------------------------------------------------------- sampling
def grid(spacing):
    """Equal-area sample points: rows `spacing` apart, columns scaled by cos(lat)."""
    rows = int(round(180 / spacing))
    for i in range(rows):
        lat = -90 + (i + 0.5) * 180 / rows
        n = max(1, int(round(360 * math.cos(math.radians(lat)) / spacing)))
        shift = 0.5 if i % 2 else 0.0      # stagger alternate rows so the pattern reads as a weave, not a lattice
        for j in range(n):
            lon = -180 + (j + 0.5 + shift) * 360 / n
            if lon >= 180:
                lon -= 360
            yield lon, lat


def find_country(countries, lon, lat):
    for ci, c in enumerate(countries):
        if c.contains(lon, lat):
            return ci
    return -1


def nearest_country(countries, lon, lat, reach_km):
    best, best_km = -1, reach_km
    for ci, c in enumerate(countries):
        x0, y0, x1, y1 = c.box
        # cheap reject: a country whose box is more than reach/100 degrees away cannot be within reach
        pad = reach_km / 100.0
        if lon < x0 - pad or lon > x1 + pad or lat < y0 - pad or lat > y1 + pad:
            continue
        for _, ring in c.rings:
            for p in ring:
                d = km(lon, lat, p[0], p[1])
                if d < best_km:
                    best, best_km = ci, d
    return best


def read_hubs():
    """HUBS lon/lat from data_atlas.js by regex (one hub per line, `{id:'…',lon:…,lat:…`)."""
    text = ATLAS.read_text(encoding='utf-8')
    block = text.split('const HUBS=', 1)[1].split('\n];', 1)[0]
    hubs = []
    for m in re.finditer(r"^\{id:'([a-z0-9]+)',lon:(-?\d+(?:\.\d+)?),lat:(-?\d+(?:\.\d+)?)", block, re.M):
        hubs.append((m.group(1), float(m.group(2)), float(m.group(3))))
    if not hubs:
        raise SystemExit('no HUBS with lon/lat found in src/data_atlas.js (expected lines like {id:\'ny\',lon:-74.01,lat:40.71,…)')
    return hubs


def fmt(v):
    s = f'{v:.1f}'
    return s[:-2] if s.endswith('.0') else s


def build(spacing):
    data = json.loads(RAW.read_text(encoding='utf-8'))
    countries = [Country(f['properties'][NAME_KEY], f['geometry']) for f in data['features']]
    # test the big countries first: most samples that are on land fall in a few large polygons
    countries.sort(key=lambda c: -(c.box[2] - c.box[0]) * (c.box[3] - c.box[1]))
    dots = []
    got = [0] * len(countries)
    for lon, lat in grid(spacing):
        ci = find_country(countries, lon, lat)
        if ci >= 0:
            dots.append((lon, lat, ci))
            got[ci] += 1
    grid_dots = len(dots)
    # one dot for every country the grid missed, at the centroid of its largest polygon
    missed = []
    for ci, c in enumerate(countries):
        if got[ci]:
            continue
        cx, cy = centroid(c.largest)
        if not c.contains(cx, cy):
            bx0, by0, bx1, by1 = bbox(c.largest)
            cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
            if not c.contains(cx, cy):
                cx, cy = min(c.largest, key=lambda p: km(p[0], p[1], cx, cy))[:2]
        dots.append((cx, cy, ci))
        got[ci] += 1
        missed.append(c.name)
    # a dot under every hub
    hub_dots = []
    reach = spacing * 111.0 * 0.55
    for hid, lon, lat in read_hubs():
        near = min((km(lon, lat, d[0], d[1]) for d in dots), default=1e9)
        if near <= reach:
            continue
        ci = find_country(countries, lon, lat)
        if ci < 0:
            ci = nearest_country(countries, lon, lat, HUB_REACH_KM)
        if ci < 0:
            print(f'warning: hub {hid} at {lon},{lat} is more than {HUB_REACH_KM:.0f} km from any country; no dot added', file=sys.stderr)
            continue
        dots.append((lon, lat, ci))
        hub_dots.append(f'{hid} ({countries[ci].name})')
    # drop countries no dot refers to and renumber, so ci stays dense
    used = sorted({ci for _, _, ci in dots}, key=lambda ci: countries[ci].name)
    remap = {ci: i for i, ci in enumerate(used)}
    names = [countries[ci].name for ci in used]
    dots = sorted(((round(lon, 1), round(lat, 1), remap[ci]) for lon, lat, ci in dots), key=lambda d: (d[1], d[0]))
    # de-duplicate after rounding
    seen = set()
    uniq = []
    for d in dots:
        k = (d[0], d[1])
        if k in seen:
            continue
        seen.add(k)
        uniq.append(d)
    return names, uniq, {'grid': grid_dots, 'missed': missed, 'hubs': hub_dots}


def render(names, dots, info, spacing, today):
    lines = []
    lines.append('// SUBHASTA — generated by tools/globe_dots.py: the dot-matrix land mask for the Atlas globe. Do not edit by hand; rerun the script.')
    lines.append(f'// Natural Earth 110m admin-0 countries (public domain) sampled on an equal-area grid, {fmt(spacing)}° between rows: {len(dots)} dots over {len(names)} countries;')
    lines.append(f'// {info["grid"]} from the grid, {len(info["missed"])} centroid dots for countries the grid missed, {len(info["hubs"])} dots placed under hubs. Each dot is [lon, lat, index into GLOBE_COUNTRIES].')
    names_js = ','.join("'" + n.replace('\\', '\\\\').replace("'", '’') + "'" for n in names)
    lines.append(f'const GLOBE_COUNTRIES=[{names_js}];')
    chunks, row = [], []
    for lon, lat, ci in dots:
        row.append(f'[{fmt(lon)},{fmt(lat)},{ci}]')
        if len(row) == 18:
            chunks.append(','.join(row))
            row = []
    if row:
        chunks.append(','.join(row))
    lines.append('const GLOBE_DOTS=[')
    lines.append(',\n'.join(chunks))
    lines.append('];')
    meta = {
        'source': 'Natural Earth 1:110m admin-0 countries, version 5 (public domain), via the nvkelso/natural-earth-vector repository',
        'url': URL,
        'generated': today,
        'spacing': spacing,
        'dots': len(dots),
        'countries': len(names),
        'hubDots': len(info['hubs']),
        'missedDots': len(info['missed']),
    }
    lines.append('const GLOBE_META=' + json.dumps(meta, ensure_ascii=False, separators=(',', ':')).replace('"', "'") + ';')
    return '\n'.join(lines) + '\n'


def main():
    ap = argparse.ArgumentParser(description='Generate src/data_globe.js, the dot-matrix land mask for the globe.')
    ap.add_argument('--spacing', type=float, default=2.0, help='degrees between latitude rows (default 2.0; 2.4 is coarser and smaller)')
    ap.add_argument('--check', action='store_true', help='regenerate in memory and exit 1 if src/data_globe.js differs')
    ap.add_argument('--fetch', action='store_true', help='download the GeoJSON again')
    ap.add_argument('--date', default=None, help='the generated date to stamp (default: today, local); --check uses the date already in the file')
    a = ap.parse_args()
    fetch(force=a.fetch)
    names, dots, info = build(a.spacing)
    today = a.date or datetime.date.today().isoformat()
    if a.check:
        current = OUT.read_text(encoding='utf-8') if OUT.exists() else ''
        m = re.search(r"'generated':'(\d{4}-\d{2}-\d{2})'", current)
        text = render(names, dots, info, a.spacing, m.group(1) if m else today)
        if text == current:
            print(f'src/data_globe.js is up to date ({len(dots)} dots, {len(text) // 1024} KB)')
            return 0
        print('src/data_globe.js differs from a fresh run; rerun python3 tools/globe_dots.py', file=sys.stderr)
        return 1
    text = render(names, dots, info, a.spacing, today)
    OUT.write_text(text, encoding='utf-8')
    print(f'wrote {OUT.relative_to(ROOT)}: {len(dots)} dots ({info["grid"]} grid, {len(info["missed"])} centroid, {len(info["hubs"])} hub) over {len(names)} countries, {len(text) // 1024} KB, spacing {fmt(a.spacing)}°')
    if info['missed']:
        print('  centroid dots:', ', '.join(info['missed']))
    if info['hubs']:
        print('  hub dots:', ', '.join(info['hubs']))
    return 0


if __name__ == '__main__':
    sys.exit(main())
