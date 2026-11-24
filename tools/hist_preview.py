#!/usr/bin/env python3
"""Render one border snapshot from data/hist/<year>.json as a PNG, to check the atlas by eye. Usage:
    python3 tools/hist_preview.py <year or path/to/year.json> [<out.png>]
Equirectangular, 1600×800: every polity filled with a light colour hashed from its name (so the same polity keeps its colour from year
to year), borders in dark grey, labels for the 25 largest polities at their label points. Polities are drawn largest first, so an
enclave painted later covers the hole it sits in. Needs Pillow; the output defaults to hist_<year>.png in the current directory."""
import json, sys, pathlib, zlib
from PIL import Image, ImageDraw, ImageFont
root = pathlib.Path(__file__).resolve().parent.parent
if len(sys.argv) < 2: sys.exit('usage: python3 tools/hist_preview.py <year or path/to/year.json> [<out.png>]')
# a year reads data/hist/<year>.json; a .json path reads that file (handy for checking a trial file before it goes in)
path = pathlib.Path(sys.argv[1]) if sys.argv[1].endswith('.json') else root / 'data' / 'hist' / f'{int(sys.argv[1])}.json'
doc = json.load(open(path, encoding='utf-8'))
year = int(doc['y'])
out = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else pathlib.Path(f'hist_{year}.png')
W, H, LABELS = 1600, 800, 25

def decode(r):
    # the inverse of flat() in gen_history_borders.py: cumulative sums of hundredths of a degree
    pts, X, Y = [], 0, 0
    for i in range(0, len(r), 2):
        X, Y = (X + r[i], Y + r[i + 1]) if i else (r[i], r[i + 1])
        pts.append(((X / 100 + 180) / 360 * W, (90 - Y / 100) / 180 * H))
    return pts

def colour(name):
    # a light, deterministic pastel from the name's CRC
    h = zlib.crc32(name.encode('utf-8'))
    hue = (h % 360) / 360; sat = 0.22 + (h >> 9) % 16 / 100; val = 0.95
    i = int(hue * 6); f = hue * 6 - i; p, q, t = val * (1 - sat), val * (1 - sat * f), val * (1 - sat * (1 - f))
    r, g, b = [(val, t, p), (q, val, p), (p, val, t), (p, q, val), (t, p, val), (val, p, q)][i % 6]
    return int(r * 255), int(g * 255), int(b * 255)

img = Image.new('RGB', (W, H), (232, 240, 248))
draw = ImageDraw.Draw(img)
for lat in range(-60, 90, 30): draw.line([(0, (90 - lat) / 180 * H), (W, (90 - lat) / 180 * H)], fill=(214, 224, 236))
for lon in range(-150, 180, 30): draw.line([((lon + 180) / 360 * W, 0), ((lon + 180) / 360 * W, H)], fill=(214, 224, 236))
polities = sorted(doc['polities'], key=lambda p: -p['a'])
for p in polities:
    for r in p['rings']: draw.polygon(decode(r), fill=colour(p['n']))
for p in polities:
    for r in p['rings']: draw.line(decode(r), fill=(70, 70, 80), width=1)
# DejaVu Sans covers the syllabics and diacritics in the names; Pillow's bundled font is the fallback
font = None
for candidate in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'DejaVuSans.ttf'):
    try: font = ImageFont.truetype(candidate, 13); break
    except Exception: continue
if font is None:
    try: font = ImageFont.load_default(size=13)
    except Exception: font = ImageFont.load_default()
for p in polities[:LABELS]:
    lat, lon = p['ll']; x, y = (lon + 180) / 360 * W, (90 - lat) / 180 * H
    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)): draw.text((x + dx, y + dy), p['n'], fill=(255, 255, 255), font=font, anchor='mm')
    draw.text((x, y), p['n'], fill=(20, 20, 30), font=font, anchor='mm')
floor = f", polities under {doc['min_a']} sq-deg left out" if 'min_a' in doc else ''
label = f"{abs(year)} {'BC' if year < 0 else 'AD'} - {len(polities)} polities, tolerance {doc.get('tol', '?')} deg{floor} - aourednik/historical-basemaps (GPL-3.0)"
draw.text((10, H - 18), label, fill=(60, 60, 70), font=font)
img.save(out)
print(f'wrote {out} ({len(polities)} polities, {LABELS} labels)')
