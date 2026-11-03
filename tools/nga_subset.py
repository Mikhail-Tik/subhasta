#!/usr/bin/env python3
"""
nga_subset.py — rebuild Subhasta's Ledger data (data/nga_subset.json) reproducibly.

The Ledger section of Subhasta shows the ownership histories ("provenance") of 771 paintings
and sculptures by 115 market-defining artists. The records come from the National Gallery of
Art's open data, which the NGA publishes under a CC0 1.0 Universal dedication (public domain):
    https://github.com/NationalGalleryOfArt/opendata   (data/objects.csv, data/published_images.csv)
Local copies live in data/nga_objects.csv and data/published_images.csv; `--fetch` downloads
them from the repository's raw URLs when they are missing.

Why an id list?  The 771 works were curated by hand from the 1,236 NGA paintings/sculptures
(classification Painting or Sculpture, accessioned, not virtual) with provenance text by those
115 artists, as a "market activity" selection. The selection rule itself was never written
down and cannot be recovered from the output, so the ids are frozen in data/nga_ids.txt and
that file is the source of truth. The JSON is a pure function of (nga_ids.txt, the two CSVs)
and this script; anybody can regenerate it, diff it, or extend it by adding an id.

Record format (one JSON object per id, keys in exactly this order):
    id   objects.csv `objectid`            (string)
    a    `attribution`                      t   `title`          d    `displaydate`
    m    `medium`                           c   `classification` cl   `creditline`
    p    `provenancetext` (see truncation)  acc `accessionnum`   y    `beginyear` (string)
    img  published_images.csv `uuid`        iw  `width` (int)    ih   `height` (int)
Every text field is whitespace-normalised: re.sub(r'\\s+', ' ', x).strip() — the CSV has
CRLFs and double spaces inside fields. `img`/`iw`/`ih` are present only when the object has a
row in published_images.csv with viewtype == 'primary' and openaccess == '1'; when several
rows qualify (object 46473 has two primary open-access images) the row that appears last in
the CSV wins — the CSV is sorted by image uuid, so this is deterministic. The IIIF image is
then https://api.nga.gov/iiif/<img>/full/!1200,1200/0/default.jpg.

Provenance truncation (keeps the shipped JSON small; the full text is one click away at
nga.gov). The main text — the ownership chain, everything before the notes — is never cut,
because the Lab reads it for the years 1933 to 1945; only the notes are. The notes start at the
last "[1]" (spaces inside the brackets allowed: the source has one "[1 ]") when the text before
it, after any trailing markers such as "[4]", ends with a full stop. Texts of 1600 characters or
fewer are kept whole. A longer text with no notes is kept whole. If the main text alone reaches
1600 characters, the notes are dropped: the main text (right-trimmed) is kept and ' …' (a space
and U+2026) appended. Otherwise the text is kept up to and including the last ';' between the
start of the notes and character 1600, or, when the notes have no ';' there, the first 1600
characters verbatim (a trailing space is kept); then ' …' is appended.

Output formatting is fixed so that a rebuild is byte-identical to the shipped file:
    json.dumps(records, ensure_ascii=False, separators=(',', ':'))   — one line, no trailing newline.

Modes
    (default)      Rebuild from data/nga_ids.txt into a temporary file next to the target,
                   compare with the existing data/nga_subset.json and report. The target is
                   replaced only with --write; otherwise a differing build is left at
                   data/nga_subset.json.new for inspection.
    --check        Build in memory; exit 0 if byte-identical to the existing file, 1 if not,
                   printing the first differing record.
    --propose N    Score the other NGA paintings/sculptures with provenance text by the same
                   artists (plus any --artist NAME, case-insensitive substring of the
                   attribution, repeatable) by market activity and print the top N that are
                   not yet in the list, for a human to add to data/nga_ids.txt.
                   score = parenthesised names (NGA puts dealers and auction sales in
                   parentheses) + occurrences of sold/auction/sale/purchased
                   + 2 × mentions of Sotheby's, Christie's, Parke-Bernet, Drouot, Knoedler,
                   Duveen, Wildenstein, Durand-Ruel.
    --fetch        Download objects.csv and published_images.csv from the NGA repository into
                   data/ (as nga_objects.csv and published_images.csv) if they are missing,
                   and print their sizes. To refresh, delete the local copies first.

A full rebuild streams both CSVs (about 170 MB) once and takes a few seconds.
Exit codes: 0 success / identical, 1 output differs from the existing file, 2 error.
Standard library only; Python 3.8+.
"""

import argparse
import csv
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / 'data'
IDS_FILE = DATA_DIR / 'nga_ids.txt'
OUT_FILE = DATA_DIR / 'nga_subset.json'
OBJECTS_CSV = DATA_DIR / 'nga_objects.csv'
IMAGES_CSV = DATA_DIR / 'published_images.csv'

RAW_BASE = 'https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data/'
SOURCES = {  # local name -> file name in the repository's data/ folder
    'nga_objects.csv': 'objects.csv',
    'published_images.csv': 'published_images.csv',
}

PROV_LIMIT = 1600      # provenance texts longer than this lose (part of) their notes
ELLIPSIS = ' …'   # appended to every truncated text
NOTES_RE = re.compile(r'\[\s*1\s*\]')
MARKERS_TAIL_RE = re.compile(r'(?:\s*\[\s*\d+\s*\])+\s*$')

CLASSES = ('Painting', 'Sculpture')
HOUSES = ("Sotheby", "Christie", "Parke-Bernet", "Drouot", "Knoedler", "Duveen", "Wildenstein", "Durand-Ruel")
PAREN_RE = re.compile(r'\([^()]*\)')
WORDS_RE = re.compile(r'\b(?:sold|auction(?:s|ed)?|sales?|purchased?)\b', re.IGNORECASE)
HOUSE_RE = re.compile('|'.join(re.escape(h) for h in HOUSES), re.IGNORECASE)

_limit = sys.maxsize          # provenance fields run to many kilobytes; lift the csv module's cap
while True:
    try:
        csv.field_size_limit(_limit)
        break
    except OverflowError:     # platforms where a C long is narrower than sys.maxsize
        _limit //= 2


# ----------------------------------------------------------------------------- helpers

def norm(text):
    """Collapse all whitespace runs to one space and strip the ends."""
    return re.sub(r'\s+', ' ', text).strip()


def notes_start(p):
    """Index where the notes begin (the last "[1]" after the main text's closing full stop), or -1."""
    found = list(NOTES_RE.finditer(p))
    if not found:
        return -1
    i = found[-1].start()
    return i if MARKERS_TAIL_RE.sub('', p[:i]).rstrip().endswith('.') else -1


def truncate_provenance(p):
    """Apply the Ledger's truncation rule (see module docstring). `p` is already normalised."""
    if len(p) <= PROV_LIMIT:
        return p
    s = notes_start(p)
    if s < 0:
        return p                                  # no notes: all of it is the main text, never cut
    if s >= PROV_LIMIT:
        return p[:s].rstrip() + ELLIPSIS          # the main text alone reaches the limit: the notes go
    cut = p.rfind(';', s, PROV_LIMIT)
    if cut >= 0:
        return p[:cut + 1] + ELLIPSIS
    return p[:PROV_LIMIT] + ELLIPSIS


def read_ids(path):
    """Return the object ids listed in `path`, in file order. '#' starts a comment."""
    ids, seen = [], set()
    try:
        lines = Path(path).read_text(encoding='utf-8').splitlines()
    except OSError as e:
        die(f'cannot read id list {path}: {e}')
    for n, raw in enumerate(lines, 1):
        line = raw.split('#', 1)[0].strip()
        if not line:
            continue
        if not line.isdigit():
            die(f'{path}:{n}: expected an NGA object id (digits), got {line!r}')
        if line in seen:
            die(f'{path}:{n}: duplicate id {line}')
        seen.add(line)
        ids.append(line)
    if not ids:
        die(f'{path}: no ids found')
    return ids


def open_csv(path):
    try:
        return open(path, encoding='utf-8-sig', newline='')
    except OSError as e:
        die(f'cannot open {path}: {e} (run with --fetch to download the NGA data)')


def is_candidate(row):
    """A real (accessioned, non-virtual) painting or sculpture with provenance text."""
    return (row['classification'] in CLASSES and row['isvirtual'] == '0'
            and row['accessioned'] == '1' and norm(row['provenancetext']) != '')


def load_objects(path, wanted, collect_pool=False):
    """Stream objects.csv once. Returns ({id: row} for wanted ids, [candidate rows] or [])."""
    found, pool = {}, []
    with open_csv(path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            oid = row['objectid']
            if oid in wanted:
                found[oid] = row
            if collect_pool and oid not in wanted and is_candidate(row):
                pool.append(row)
    return found, pool


def load_images(path, wanted):
    """Stream published_images.csv once; return {id: row} of primary open-access images.

    When an object has several qualifying rows the last one in the CSV wins (this reproduces
    the shipped file; the CSV is sorted by uuid). Objects with several rows are reported.
    """
    images, multi = {}, set()
    with open_csv(path) as f:
        for row in csv.DictReader(f):
            oid = row['depictstmsobjectid']
            if oid in wanted and row['viewtype'] == 'primary' and row['openaccess'] == '1':
                if oid in images:
                    multi.add(oid)
                images[oid] = row
    for oid in sorted(multi, key=int):
        warn(f'object {oid} has more than one primary open-access image; using the last one in the CSV')
    return images


def build_record(oid, row, image):
    rec = {
        'id': oid,
        'a': norm(row['attribution']),
        't': norm(row['title']),
        'd': norm(row['displaydate']),
        'm': norm(row['medium']),
        'c': norm(row['classification']),
        'cl': norm(row['creditline']),
        'p': truncate_provenance(norm(row['provenancetext'])),
        'acc': norm(row['accessionnum']),
        'y': norm(row['beginyear']),
    }
    if image is not None:
        rec['img'] = image['uuid']
        rec['iw'] = int(image['width'])
        rec['ih'] = int(image['height'])
    return rec


def build(ids, objects_csv, images_csv, collect_pool=False):
    """Build the records for `ids` in order. Returns (records, candidate pool, artists)."""
    wanted = set(ids)
    objects, pool = load_objects(objects_csv, wanted, collect_pool)
    missing = [i for i in ids if i not in objects]
    if missing:
        die(f'{len(missing)} id(s) from the list are not in {objects_csv}: {", ".join(missing[:20])}'
            + (' …' if len(missing) > 20 else ''))
    images = load_images(images_csv, wanted)
    records = []
    for oid in ids:
        row = objects[oid]
        if row['classification'] not in CLASSES:
            warn(f'object {oid} is classified {row["classification"]!r}, not Painting/Sculpture')
        if not norm(row['provenancetext']):
            warn(f'object {oid} has no provenance text')
        records.append(build_record(oid, row, images.get(oid)))
    artists = {r['a'] for r in records}
    return records, pool, artists


def dump(records):
    """Serialise exactly like the shipped file: compact, UTF-8, one line, no trailing newline."""
    return json.dumps(records, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


def describe_difference(existing_bytes, new_records):
    """Explain how the rebuilt records differ from the existing file; returns lines of text."""
    try:
        old = json.loads(existing_bytes.decode('utf-8'))
    except (UnicodeDecodeError, ValueError) as e:
        return [f'existing file is not valid JSON ({e})']
    if not isinstance(old, list):
        return ['existing file is not a JSON list']
    if old == new_records:
        return ['same records, different serialisation (formatting, key order or trailing newline)']
    lines = []
    if len(old) != len(new_records):
        lines.append(f'record count: existing {len(old)}, rebuilt {len(new_records)}')
    old_ids = [r.get('id') for r in old]
    new_ids = [r['id'] for r in new_records]
    only_old = [i for i in old_ids if i not in set(new_ids)]
    only_new = [i for i in new_ids if i not in set(old_ids)]
    if only_old:
        lines.append(f'only in existing file: {", ".join(map(str, only_old[:15]))}' + (' …' if len(only_old) > 15 else ''))
    if only_new:
        lines.append(f'only in rebuilt output: {", ".join(only_new[:15])}' + (' …' if len(only_new) > 15 else ''))
    for n, (a, b) in enumerate(zip(old, new_records)):
        if a != b:
            if a.get('id') != b['id']:
                lines.append(f'first differing record: #{n} is {a.get("id")} in the existing file but {b["id"]} in the rebuild (order changed?)')
                break
            lines.append(f'first differing record: #{n} id {b["id"]} ({b["a"]} — {b["t"]})')
            for k in list(dict.fromkeys(list(a) + list(b))):
                if a.get(k) != b.get(k):
                    lines.append(f'  {k}: existing {clip(a.get(k))}')
                    lines.append(f'  {" " * len(k)}  rebuilt  {clip(b.get(k))}')
            break
    return lines


def clip(value, width=160):
    s = '<absent>' if value is None else repr(value)
    return s if len(s) <= width else s[:width - 1] + '…'


def warn(msg):
    print('warning: ' + msg, file=sys.stderr)


def die(msg, code=2):
    print('error: ' + msg, file=sys.stderr)
    sys.exit(code)


# ----------------------------------------------------------------------------- modes

def mode_build(args, write):
    t0 = time.time()
    ids = read_ids(args.ids)
    records, _, artists = build(ids, args.objects, args.images)
    out = dump(records)
    target = Path(args.out)
    tmp = target.with_name(target.name + '.new')
    try:
        tmp.write_bytes(out)
    except OSError as e:
        die(f'cannot write {tmp}: {e}')
    existing = target.read_bytes() if target.exists() else None
    with_img = sum(1 for r in records if 'img' in r)
    print(f'built {len(records)} records by {len(artists)} artists ({with_img} with images), '
          f'{len(out):,} bytes in {time.time() - t0:.1f}s')
    if existing is None:
        print(f'no existing {target} to compare with')
        identical = False
    else:
        identical = existing == out
        print('output is byte-identical to the existing file' if identical
              else 'output DIFFERS from the existing file')
        if not identical:
            for line in describe_difference(existing, records):
                print('  ' + line)
    if write:
        os.replace(tmp, target)
        print(f'wrote {target}')
        return 0
    if identical:
        tmp.unlink()
        return 0
    print(f'not written (use --write); the rebuilt output is at {tmp}')
    return 1


def mode_check(args):
    t0 = time.time()
    ids = read_ids(args.ids)
    records, _, _ = build(ids, args.objects, args.images)
    out = dump(records)
    target = Path(args.out)
    if not target.exists():
        print(f'{target} does not exist')
        return 1
    existing = target.read_bytes()
    if existing == out:
        print(f'byte-identical: {target} ({len(out):,} bytes, {len(records)} records) rebuilt in {time.time() - t0:.1f}s')
        return 0
    print(f'DIFFERS: {target} is {len(existing):,} bytes, rebuilt output is {len(out):,} bytes')
    for line in describe_difference(existing, records):
        print('  ' + line)
    return 1


def score(p):
    parens = len(PAREN_RE.findall(p))
    words = len(WORDS_RE.findall(p))
    houses = len(HOUSE_RE.findall(p))
    return parens + words + 2 * houses, parens, words, houses


def mode_propose(args):
    t0 = time.time()
    ids = read_ids(args.ids)
    records, pool, artists = build(ids, args.objects, args.images, collect_pool=True)
    extra = [a.lower() for a in (args.artist or [])]
    hits = {a: 0 for a in extra}
    candidates = []
    for row in pool:
        a = norm(row['attribution'])
        matched = a in artists
        for e in extra:
            if e in a.lower():
                hits[e] += 1
                matched = True
        if matched:
            candidates.append(row)
    for e, n in hits.items():
        if n == 0:
            warn(f'--artist {e!r} matched no painting or sculpture with provenance text')
    scored = []
    for row in candidates:
        p = norm(row['provenancetext'])
        s, parens, words, houses = score(p)
        scored.append((s, parens, words, houses, norm(row['attribution']), norm(row['title']), row['objectid'], p))
    scored.sort(key=lambda x: (-x[0], x[4], x[5]))
    print(f'{len(candidates)} candidate works not yet in the list (by {len(artists)} listed artists'
          + (f' + {len(extra)} named' if extra else '') + f'); top {args.propose} by market-activity score '
          f'(parenthesised names + sold/auction/sale/purchased + 2×houses), {time.time() - t0:.1f}s')
    for s, parens, words, houses, a, t, oid, p in scored[:args.propose]:
        print(f'{oid:>7}  score {s:>3} ({parens}p {words}w {houses}h)  {a} — {t}')
        print(f'         {p[:120]}')
    return 0


def mode_fetch(args):
    data_dir = Path(args.objects).parent
    data_dir.mkdir(parents=True, exist_ok=True)
    rc = 0
    for local, remote in SOURCES.items():
        dest = data_dir / local
        if dest.exists():
            print(f'{dest}: exists, {dest.stat().st_size:,} bytes (delete it to re-download)')
            continue
        url = RAW_BASE + remote
        part = dest.with_name(dest.name + '.part')
        print(f'{dest}: downloading {url} …', flush=True)
        try:
            with urllib.request.urlopen(url, timeout=120) as resp, open(part, 'wb') as f:
                total = 0
                while True:
                    chunk = resp.read(1 << 20)
                    if not chunk:
                        break
                    f.write(chunk)
                    total += len(chunk)
            os.replace(part, dest)
            print(f'{dest}: {total:,} bytes')
        except Exception as e:  # network errors, HTTP errors, disk errors
            if part.exists():
                part.unlink()
            print(f'{dest}: download failed: {e}', file=sys.stderr)
            rc = 2
    return rc


# ----------------------------------------------------------------------------- cli

def main(argv=None):
    ap = argparse.ArgumentParser(
        prog='nga_subset.py',
        description="Rebuild Subhasta's Ledger data (data/nga_subset.json) from the frozen id list "
                    'data/nga_ids.txt and the National Gallery of Art open data (CC0). '
                    'Without a mode flag it rebuilds, compares with the existing file and only '
                    'overwrites with --write.',
        epilog='See the module docstring (head of this file) for the record format, the provenance '
               'truncation rule and the data provenance.')
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument('--check', action='store_true',
                      help='rebuild in memory and exit 0 if byte-identical to the existing file, 1 otherwise')
    mode.add_argument('--propose', type=int, metavar='N',
                      help='print the N highest-scoring NGA works not yet in the list')
    mode.add_argument('--fetch', action='store_true',
                      help='download the two NGA CSVs into data/ if they are missing')
    ap.add_argument('--write', action='store_true',
                    help='(default mode) replace data/nga_subset.json with the rebuilt output')
    ap.add_argument('--artist', action='append', metavar='NAME',
                    help='(--propose) also consider works whose attribution contains NAME; repeatable')
    ap.add_argument('--ids', default=str(IDS_FILE), help=f'id list (default {IDS_FILE.relative_to(ROOT)})')
    ap.add_argument('--out', default=str(OUT_FILE), help=f'target JSON (default {OUT_FILE.relative_to(ROOT)})')
    ap.add_argument('--objects', default=str(OBJECTS_CSV), help=f'NGA objects.csv (default {OBJECTS_CSV.relative_to(ROOT)})')
    ap.add_argument('--images', default=str(IMAGES_CSV), help=f'NGA published_images.csv (default {IMAGES_CSV.relative_to(ROOT)})')
    args = ap.parse_args(argv)

    if args.propose is not None and args.propose < 1:
        ap.error('--propose N needs N >= 1')
    if args.artist and args.propose is None:
        ap.error('--artist only makes sense with --propose')
    if args.write and (args.check or args.fetch or args.propose is not None):
        ap.error('--write only applies to the default (rebuild) mode')

    if args.fetch:
        return mode_fetch(args)
    if args.check:
        return mode_check(args)
    if args.propose is not None:
        return mode_propose(args)
    return mode_build(args, write=args.write)


if __name__ == '__main__':
    sys.exit(main())
