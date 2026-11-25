#!/usr/bin/env python3
"""Collect the interface strings to translate (v35): the visible text of src/page.html and the text fragments of the templates in the
interface scripts, with every ${…} written as # (the page's translator matches a text node, its numbers written as #, against the
same keys). Writes data/i18n/src/ui-<n>.json {key: English}; the Russian goes to data/i18n/ru/ui-<n>.json.

    python3 -I tools/i18n_ui.py"""
import json, pathlib, re, html
root = pathlib.Path(__file__).resolve().parent.parent
FILES = ['page.html', 'app.js', 'nav.js', 'world.js', 'eye.js', 'move.js', 'today.js', 'school.js', 'library.js', 'globe.js', 'russia.js']
out = {}
def add(s):
    s = html.unescape(re.sub(r'\s+', ' ', s)).strip()
    s = re.sub(r'\$\{[^{}]*\}', '#', s)
    s = re.sub(r'\d+(?:[.,]\d+)*', '#', s)
    if len(s) < 2 or len(s) > 220 or not re.search(r'[A-Za-z]{2}', s): return
    if re.search(r'[{};=]|=>|\bfunction\b|\breturn\b|\bconst\b|px\b|rgba?\(|var\(--|^[.#\[]?[a-z-]+(\s*[,>+~]\s*[.#]?[a-z-]+)*$|^https?:|\.(js|css|json|jpg|png)$', s): return
    if re.fullmatch(r'[a-z][a-zA-Z0-9]*', s) and len(s) < 14: return   # an identifier
    if re.fullmatch(r'[a-z]+(-[a-z0-9]+)+', s): return               # a css class or an id
    if s.count('#') > 6: return
    out[s] = s
for name in FILES:
    f = root / 'src' / name
    if not f.exists(): continue
    t = f.read_text(encoding='utf-8')
    if name.endswith('.html'):
        t = re.sub(r'<(script|style)[\s\S]*?</\1>', ' ', t)
        for m in re.finditer(r'>([^<>]+)<', t): add(m.group(1))
        for m in re.finditer(r'(?:aria-label|title|placeholder)="([^"]+)"', t): add(m.group(1))
        continue
    # the text between tags inside template literals, and attribute texts
    for m in re.finditer(r'`((?:[^`\\]|\\.)*)`', t):
        body = m.group(1)
        if '<' in body:
            for g in re.finditer(r'>([^<>]+)<', body): add(g.group(1))
            for g in re.finditer(r'(?:aria-label|title|placeholder)="([^"]+)"', body): add(g.group(1))
        elif ' ' in body: add(body)
    # quoted strings that read as words (a label, a status, a heading)
    for m in re.finditer(r"'((?:[^'\\\n]|\\.){3,200})'|\"((?:[^\"\\\n]|\\.){3,200})\"", t):
        s = m.group(1) or m.group(2)
        if re.search(r'[A-Z][a-z]|[a-z] [a-z]', s) and not re.search(r'</?[a-z]', s): add(s)
keys = sorted(out)
d = root / 'data' / 'i18n' / 'src'
for f in d.glob('ui-*.json'): f.unlink()
chunk, size, n, files = {}, 0, 1, []
for k in keys:
    if size > 45000:
        (d / f'ui-{n}.json').write_text(json.dumps(chunk, ensure_ascii=False, indent=0), encoding='utf-8'); files.append((n, len(chunk))); chunk, size, n = {}, 0, n + 1
    chunk[k] = k; size += len(k.encode())
if chunk: (d / f'ui-{n}.json').write_text(json.dumps(chunk, ensure_ascii=False, indent=0), encoding='utf-8'); files.append((n, len(chunk)))
print(f'{len(keys)} interface strings in {len(files)} files:', files)
