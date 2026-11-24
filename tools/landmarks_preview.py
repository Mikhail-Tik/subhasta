#!/usr/bin/env python3
"""Render every drawing in a landmarks-style JSON file to one contact sheet (PNG).

    python3 tools/landmarks_preview.py [data.json] [out.png] [--cols N] [--only A,B]

data.json defaults to data/landmarks.json; data/wonders.json uses the same
drawing format (polylines in a 100x100 box, y down, ground at y=100) and can
be passed instead.  out.png defaults to <stem>.png in the scratchpad folder.

Each drawing gets a 160x160 cell (black lines on cream, stroke 1.5 px x w,
drawn 4x oversize and downsampled so hairlines stay crisp), its label, and a
40 px-tall miniature next to the label - the "recognisable at 40 px" test.
Prints a table of path/point counts and warns about anything outside the
100x100 box, more than 8 paths or more than 160 points.
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATA = os.path.join(HERE, "..", "data", "landmarks.json")
SCRATCH = "/tmp/claude-0/-home-claude/726626c5-26bf-57d4-8ba9-c4a299f32622/scratchpad"

CELL = 160          # drawing area, px
STRIP = 44          # label strip under the drawing (name + 40 px miniature)
MINI = 40           # miniature height, px
SS = 4              # supersampling factor
PAD = 10            # margin inside the cell around the 100x100 box
CREAM = (247, 240, 222)
INK = (28, 22, 16)
FAINT = (222, 210, 184)
LABEL = (90, 76, 56)


FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
]


def load_font(size):
    for path in FONT_CANDIDATES:          # a Unicode TTF so names like São Paulo print
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                pass
    try:
        return ImageFont.load_default(size=size)
    except TypeError:            # Pillow < 10.1
        return ImageFont.load_default()


def draw_landmark(item, box_px, stroke_px, frame=False):
    """Return an RGB image with the drawing; box_px is the pixel height of the
    100-unit box, stroke_px the final stroke width (before the item's w)."""
    pad = round(box_px * PAD / 140.0) if frame else 1
    size = box_px + 2 * pad
    big = Image.new("RGB", (size * SS, size * SS), CREAM)
    d = ImageDraw.Draw(big)
    scale = box_px / 100.0 * SS

    def P(x, y):
        return (pad * SS + x * scale, pad * SS + y * scale)

    if frame:
        d.rectangle([P(0, 0), P(100, 100)], outline=FAINT, width=SS)
        d.line([P(0, 100), P(100, 100)], fill=FAINT, width=2 * SS)
    width = max(1, round(stroke_px * item.get("w", 1.0) * SS))
    for path in item["paths"]:
        pts = [P(x, y) for x, y in path]
        if len(pts) == 1:
            pts = pts * 2
        d.line(pts, fill=INK, width=width, joint="curve")
        # round caps: a dot at each end so stitched strokes don't look chopped
        r = width / 2.0
        for x, y in (pts[0], pts[-1]):
            d.ellipse([x - r, y - r, x + r, y + r], fill=INK)
    return big.resize((size, size), Image.LANCZOS)


def labels(item):
    """(headline, subline) for the cell: city/site, then the name."""
    head = item.get("city") or item.get("site") or item.get("id") or ""
    name = item.get("n") or item.get("name") or ""
    return head, name


def check(item):
    warns = []
    paths = item.get("paths", [])
    npts = sum(len(p) for p in paths)
    if len(paths) > 8:
        warns.append("%d paths" % len(paths))
    if npts > 160:
        warns.append("%d points" % npts)
    lo = min((min(x, y) for p in paths for x, y in p), default=0)
    hi = max((max(x, y) for p in paths for x, y in p), default=0)
    if lo < -0.05 or hi > 100.05:
        warns.append("outside box (%.1f..%.1f)" % (lo, hi))
    top = min((y for p in paths for x, y in p), default=100)
    if 100 - top < 45:
        warns.append("only %.0f units high" % (100 - top))
    return npts, warns


def main(argv):
    data_path = DEFAULT_DATA
    out = None
    cols = 8
    only = None
    args = list(argv)
    while args:
        a = args.pop(0)
        if a == "--cols":
            cols = int(args.pop(0))
        elif a == "--only":
            only = set(s.strip() for s in args.pop(0).split(","))
        elif a.lower().endswith(".json"):
            data_path = a
        else:
            out = a
    if out is None:
        stem = os.path.splitext(os.path.basename(data_path))[0]
        out = os.path.join(SCRATCH, stem + ".png")

    with open(data_path) as f:
        data = json.load(f)
    items = data["items"]
    if only:
        items = [it for it in items if (it.get("city") or it.get("id") or it.get("site")) in only]
    if not items:
        print("no drawings to render")
        return 1

    rows = (len(items) + cols - 1) // cols
    cell_h = CELL + STRIP
    sheet = Image.new("RGB", (cols * CELL, rows * cell_h), CREAM)
    d = ImageDraw.Draw(sheet)
    font = load_font(12)
    small = load_font(10)

    print("%-16s %-32s %5s %5s  %s" % ("city/site", "name", "paths", "pts", "warnings"))
    for k, item in enumerate(items):
        cx = (k % cols) * CELL
        cy = (k // cols) * cell_h
        head, name = labels(item)
        npts, warns = check(item)
        print("%-16s %-32s %5d %5d  %s" % (head, name, len(item["paths"]), npts, "; ".join(warns)))
        main_img = draw_landmark(item, CELL - 2 * PAD, 1.5, frame=True)
        sheet.paste(main_img, (cx, cy))
        mini = draw_landmark(item, MINI, 1.0)
        sheet.paste(mini, (cx + CELL - mini.width - 4, cy + CELL + 1))
        d.text((cx + 6, cy + CELL + 4), head[:18], fill=INK, font=font)
        if len(name) > 22:
            name = name[:21] + "~"
        d.text((cx + 6, cy + CELL + 20), name, fill=LABEL, font=small)
        d.line([(cx, cy + cell_h - 1), (cx + CELL, cy + cell_h - 1)], fill=FAINT)
        d.line([(cx + CELL - 1, cy), (cx + CELL - 1, cy + cell_h)], fill=FAINT)

    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    sheet.save(out)
    print("sheet: %s  (%d drawings, %dx%d)" % (out, len(items), sheet.width, sheet.height))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
