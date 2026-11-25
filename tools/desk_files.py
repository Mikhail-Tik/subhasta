#!/usr/bin/env python3
"""Write the website's copies of the live desk from a dump of the main artifact's database (v34).

    python3 -I tools/desk_files.py <dump dir>

<dump dir> is where ArtifactData saved the documents with out_dir: <dump dir>/live/{status,read,sales,wire,lots}.json and
<dump dir>/kb/<id>.json (each file the document's fields). Writes docs/live/<id>.json (compact JSON, the same documents) and
docs/kb/index.json (every kb document as {id, q, a, src, asof, tags, kind}, sorted by id). The page reads these beside itself on the
website (src/today.js, liveStatic) with the same checks as the database's documents. Prints what it wrote."""
import json, pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
if len(sys.argv) < 2: sys.exit('usage: python3 -I tools/desk_files.py <dump dir>')
dump = pathlib.Path(sys.argv[1])
live_out, kb_out = root / 'docs' / 'live', root / 'docs' / 'kb'
live_out.mkdir(parents=True, exist_ok=True); kb_out.mkdir(parents=True, exist_ok=True)
wrote = []
for f in ('status', 'read', 'sales', 'wire', 'lots'):
    p = dump / 'live' / f'{f}.json'
    if not p.exists(): print(f'  live/{f}: not in the dump; the website keeps its old file'); continue
    d = json.load(open(p, encoding='utf-8'))
    if not isinstance(d, dict) or not d.get('asof'): print(f'  live/{f}: not a document with asof; skipped'); continue
    (live_out / f'{f}.json').write_text(json.dumps(d, ensure_ascii=False, separators=(',', ':')), encoding='utf-8'); wrote.append(f'live/{f} ({d["asof"]})')
kb = []
for p in sorted((dump / 'kb').glob('*.json')) if (dump / 'kb').exists() else []:
    d = json.load(open(p, encoding='utf-8'))
    if not isinstance(d, dict) or not d.get('q') or not d.get('a'): continue
    kb.append({'id': p.stem, **{k: d.get(k) for k in ('q', 'a', 'src', 'asof', 'tags', 'kind')}})
if kb:
    (kb_out / 'index.json').write_text(json.dumps(kb, ensure_ascii=False, separators=(',', ':')), encoding='utf-8'); wrote.append(f'kb/index ({len(kb)} rows)')
print('wrote', ', '.join(wrote) if wrote else 'nothing')
