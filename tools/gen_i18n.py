#!/usr/bin/env python3
"""Assemble the Russian pack of the page (v35): docs/i18n/ru.json from the translators' files in data/i18n/ru/ (made from
data/i18n/src/ by tools/i18n_extract.py and tools/i18n_ui.py; rules in data/i18n/GLOSSARY.md).

    python3 -I tools/gen_i18n.py

ui-*.json and ui-extra.json → "ui" (an English text with its numbers written # → its Russian; a translation whose count of # differs
from the English is dropped); pol-*.json → "pol" (the names on the historical map) and also "ui" (the same names where the page writes
them as text); the rest (ev, cent, won, ppl, cty, con, wev, pic, mvt, obc, obj, mov) → "data" (a field of a row, set in place while
Russian is on). Only finished files are read (not the translators' .part files). Prints the counts and what it dropped."""
import json, pathlib, re, datetime
root = pathlib.Path(__file__).resolve().parent.parent
src_dir, ru_dir = root / 'data' / 'i18n' / 'src', root / 'data' / 'i18n' / 'ru'
pack = {'v': 1, 'asof': datetime.date.today().isoformat(), 'ui': {}, 'data': {}, 'pol': {}, 'names': {}}
dropped, missing = [], []
for f in sorted(ru_dir.glob('*.json')):
    if '.part' in f.name: continue
    try: ru = json.load(open(f, encoding='utf-8'))
    except Exception as e: dropped.append((f.name, f'not JSON: {e}')); continue
    if not isinstance(ru, dict): continue
    srcf = src_dir / f.name
    en = json.load(open(srcf, encoding='utf-8')) if srcf.exists() else None
    if en is not None:
        miss = [k for k in en if k not in ru]
        if miss: missing.append((f.name, len(miss)))
    part = f.name.split('-')[0]
    for k, v in ru.items():
        if not isinstance(v, str) or not v.strip(): continue
        v = v.strip()
        if part == 'ui':
            eng = (en or {}).get(k, k)
            if eng.count('#') != v.count('#'): dropped.append((f.name, k[:60])); continue
            if v != k: pack['ui'][k] = v
        elif part == 'names':   # v36: the painters' names, as the globe and the cards write them (L10N.name)
            if v != k: pack['names'][k] = v
        elif part == 'pol':
            name = k[4:] if k.startswith('pol.') else k
            if v != name: pack['pol'][name] = v; pack['ui'].setdefault(name, v)
        else:
            pack['data'][k] = v
out = root / 'docs' / 'i18n'
out.mkdir(parents=True, exist_ok=True)
(out / 'ru.json').write_text(json.dumps(pack, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
for d in dropped[:12]: print('  dropped:', d)
if len(dropped) > 12: print(f'  … and {len(dropped) - 12} more dropped')
for m in missing: print(f'  {m[0]}: {m[1]} keys not translated (they stay English)')
print(f"wrote docs/i18n/ru.json: {len(pack['ui'])} interface texts, {len(pack['data'])} data fields, {len(pack['pol'])} names on the map, {len(pack['names'])} painters' names; {(out / 'ru.json').stat().st_size // 1024} KB")
