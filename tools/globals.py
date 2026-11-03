#!/usr/bin/env python3
"""
tools/globals.py — the global-namespace map of Subhasta.

The build (build.py) concatenates every src/*.js file into ONE <script> element, so
names declared at the top of a file are shared with every other file that runs in
the same scope. This script lists those names, who uses them, where two files declare
the same name, what is declared but never used elsewhere, and which file depends on
which. It is dependency-free (Python 3.8+) and never edits anything.

    python3 tools/globals.py             Markdown report on stdout
    python3 tools/globals.py --json      the same findings as JSON
    python3 tools/globals.py --no-tables skip the per-file tables (summary sections only)
    python3 tools/globals.py --src DIR   scan another folder (default: ../src next to this file)

HOW IT READS THE FILES
  A small hand-written JavaScript scanner walks each file once and masks out comments,
  string literals, the text parts of template literals and regex literals, keeping the
  code inside `${ ... }` template expressions. It tracks brace, paren and bracket depth,
  so "top level" is well defined: brace depth 0 and paren depth 0 of the file, OR, for a
  file whose whole body is wrapped in an IIFE `(function(){ ... })();` (app.js, reel.js),
  depth 1 inside that wrapper. The declarations recorded are `const`, `let`, `var`
  (every declarator, incl. comma lists and shallow destructuring), `function` (incl.
  `async function` and `function*`) and `class` at that level.

THE THREE SCOPES OF THE BUILT PAGE
  page   src/page.html's inline script (const NGA) and the nine data_*.js files: true
         script-scope globals, visible to every other script on the page.
  app    app.js's IIFE, into which build.py pastes under.js, pulse.js, atlas.js and
         clinic.js: one block scope shared by five files.
  reel   reel.js's own IIFE; it reaches the app only through window.__S and the page
         globals.
  A name declared twice in the SAME scope is a bug: a SyntaxError for const/let/class, a
  silent override for var/function. The same name in two different scopes is shadowing
  (legal, confusing) or, between the two IIFEs, a duplicated helper.

HOW REFERENCES ARE RESOLVED (an approximation, stated in the report)
  An identifier token in file G counts as a reference when it is not preceded by `.`
  (a property access) and is not an object-literal key (preceded by `{` or `,` and
  followed by `:`). It is resolved to the nearest declaration: G itself (own, not
  reported), then another file of G's scope, then the page scope. Identifiers that
  resolve nowhere are DOM/builtin names or typos; the constant-looking ones
  (ALL_CAPS) are listed so a typo such as HUBS_OLDD is caught. The scanner is not a
  parser: a `/` after `)` or an identifier is read as division, otherwise as a regex
  start; automatic semicolon insertion is approximated. Both are fine for this code
  base and are re-checked by the syntax tests (test.js) anyway.
"""
import argparse
import json
import os
import re
import sys

DATA_FILES = ['data_houses.js', 'data_market.js', 'data_more.js', 'data_people.js', 'data_reel.js',
              'data_under.js', 'data_pulse.js', 'data_atlas.js', 'data_world.js']
APP_INNER = ['under.js', 'pulse.js', 'atlas.js', 'clinic.js']


def _from_build():
    """The paste order as build.py states it (DATA_ORDER and the engine placeholders pasted into app.js), so a new data
    file or engine is scoped correctly without editing this file; the two lists above are the fallback."""
    try:
        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'build.py'), encoding='utf-8') as fh:
            b = fh.read()
    except OSError:
        return None
    m = re.search(r"DATA_ORDER\s*=\s*\[([^\]]*)\]", b)
    inner = re.findall(r"\('/\*__[A-Z]+__\*/',\s*'([\w.]+\.js)'\)", b)
    if not m or not inner:
        return None
    return [n + '.js' for n in re.findall(r"'([\w]+)'", m.group(1))], [f for f in inner if f != 'reel.js']


_built = _from_build()
if _built:
    DATA_FILES, APP_INNER = _built
# evaluation order in the built page (page.html <script>): data files, const NGA, app (+inner), reel
BUILD_ORDER = ['page.html'] + DATA_FILES + ['app.js'] + APP_INNER + ['reel.js']
SCOPE_OF = {**{f: 'page' for f in DATA_FILES}, 'page.html': 'page', 'app.js': 'app',
            **{f: 'app' for f in APP_INNER}, 'reel.js': 'reel'}
DECL_KW = {'const', 'let', 'var'}
# a `/` after one of these words starts a regex, not a division
REGEX_AFTER_WORDS = {'return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void',
                     'throw', 'instanceof', 'yield', 'await'}
IDENT_START = re.compile(r'[A-Za-z_$À-￿]')
IDENT_CHAR = re.compile(r'[\w$À-￿]')
CONST_LIKE = re.compile(r'^[A-Z][A-Z0-9_]{2,}$')


# ----------------------------------------------------------------------------- scanner
class Tok:
    __slots__ = ('kind', 'text', 'pos', 'line', 'depth', 'pdepth', 'bdepth')

    def __init__(self, kind, text, pos, line, depth, pdepth, bdepth):
        self.kind, self.text, self.pos, self.line = kind, text, pos, line
        self.depth, self.pdepth, self.bdepth = depth, pdepth, bdepth

    def __repr__(self):
        return f'{self.kind}:{self.text}@{self.line}'


def scan(code):
    """Return (tokens, masked).

    tokens: identifiers, numbers, single-character punctuation and newlines ('nl'), each
            with the brace/paren/bracket depth BEFORE the token.
    masked: the source with comments, strings, template text and regex literals replaced
            by spaces (newlines kept), so line numbers and offsets are unchanged.
    """
    n = len(code)
    out = list(code)
    toks = []
    i = 0
    line = 1
    depth = pdepth = bdepth = 0
    # template-literal expression frames: brace count inside the current `${ ... }`
    frames = []
    in_template = False
    last_sig = None  # last significant token (for the regex/division decision)

    def mask(a, b):
        for k in range(a, b):
            if out[k] != '\n':
                out[k] = ' '

    def emit(kind, text, pos):
        nonlocal last_sig
        t = Tok(kind, text, pos, line, depth, pdepth, bdepth)
        toks.append(t)
        if kind != 'nl':
            last_sig = t
        return t

    def regex_allowed():
        if last_sig is None:
            return True
        if last_sig.kind == 'ident':
            return last_sig.text in REGEX_AFTER_WORDS
        if last_sig.kind == 'num':
            return False
        return last_sig.text not in (')', ']', '}')

    while i < n:
        c = code[i]
        if in_template:
            if c == '\\':
                mask(i, min(n, i + 2)); i += 2; continue
            if c == '`':
                out[i] = ' '; in_template = False; i += 1; continue
            if c == '$' and i + 1 < n and code[i + 1] == '{':
                mask(i, i + 2); frames.append(0); in_template = False; i += 2; continue
            if c == '\n':
                line += 1
            else:
                out[i] = ' '
            i += 1
            continue
        # ---- code mode
        if c == '\n':
            emit('nl', '\n', i); line += 1; i += 1; continue
        if c in ' \t\r\f\v':
            i += 1; continue
        if c == '/' and i + 1 < n and code[i + 1] == '/':
            j = code.find('\n', i)
            j = n if j < 0 else j
            mask(i, j); i = j; continue
        if c == '/' and i + 1 < n and code[i + 1] == '*':
            j = code.find('*/', i + 2)
            j = n if j < 0 else j + 2
            line += code.count('\n', i, j)
            mask(i, j); i = j; continue
        if c in '\'"':
            j = i + 1
            while j < n and code[j] != c:
                if code[j] == '\\':
                    j += 1
                if j < n and code[j] == '\n':
                    line += 1
                j += 1
            j = min(n, j + 1)
            mask(i, j); emit('str', c, i); i = j; continue
        if c == '`':
            out[i] = ' '; in_template = True; emit('str', '`', i); i += 1; continue
        if c == '/' and regex_allowed():
            j = i + 1
            in_class = False
            while j < n and code[j] != '\n':
                d = code[j]
                if d == '\\':
                    j += 2; continue
                if in_class:
                    if d == ']':
                        in_class = False
                elif d == '[':
                    in_class = True
                elif d == '/':
                    break
                j += 1
            j += 1
            while j < n and IDENT_CHAR.match(code[j]):  # flags
                j += 1
            mask(i, j); emit('re', '/', i); i = j; continue
        if c == '{':
            emit('punct', '{', i); depth += 1
            if frames:
                frames[-1] += 1
            i += 1; continue
        if c == '}':
            if frames and frames[-1] == 0:
                frames.pop(); out[i] = ' '; in_template = True; i += 1; continue
            depth -= 1
            if frames:
                frames[-1] -= 1
            emit('punct', '}', i); i += 1; continue
        if c == '(':
            emit('punct', '(', i); pdepth += 1; i += 1; continue
        if c == ')':
            pdepth -= 1; emit('punct', ')', i); i += 1; continue
        if c == '[':
            emit('punct', '[', i); bdepth += 1; i += 1; continue
        if c == ']':
            bdepth -= 1; emit('punct', ']', i); i += 1; continue
        if IDENT_START.match(c):
            j = i + 1
            while j < n and IDENT_CHAR.match(code[j]):
                j += 1
            emit('ident', code[i:j], i); i = j; continue
        if c.isdigit() or (c == '.' and i + 1 < n and code[i + 1].isdigit()):
            j = i + 1
            while j < n and (code[j].isalnum() or code[j] in '._'):
                j += 1
            emit('num', code[i:j], i); i = j; continue
        emit('punct', c, i); i += 1
    return toks, ''.join(out)


# ------------------------------------------------------------------------- declarations
OPERATOR_TAIL = set('+-*/%=<>&|^!?:,.([{~')  # a line ending with one of these continues


def is_iife(masked):
    head = re.match(r'\s*\(\s*(?:async\s+)?(?:function\s*\*?\s*\w*\s*\([^)]*\)|\([^)]*\)\s*=>)\s*\{', masked)
    tail = re.search(r'\}\s*\)\s*\(\s*\)\s*;?\s*$', masked)
    return bool(head and tail)


def declarations(toks, base_depth, base_pdepth):
    """Top-level declarations: list of dicts {name, kind, line}."""
    decls = []
    sig = [t for t in toks]  # keep newlines for ASI
    k = 0
    N = len(sig)

    def at_base(t):
        return t.depth == base_depth and t.pdepth == base_pdepth and t.bdepth == 0

    def nxt(j):
        while j < N and sig[j].kind == 'nl':
            j += 1
        return j

    def prev_sig(j):
        j -= 1
        while j >= 0 and sig[j].kind == 'nl':
            j -= 1
        return sig[j] if j >= 0 else None

    def skip_initializer(j):
        """From the token after '=', advance to the ',' or ';' that ends this declarator
        (at base level), or to an ASI newline. Returns the index of that terminator."""
        while j < N:
            t = sig[j]
            if t.kind == 'nl':
                if at_base(t) or (t.depth == base_depth and t.pdepth == base_pdepth and t.bdepth == 0):
                    p = prev_sig(j)
                    q = nxt(j + 1)
                    nt = sig[q] if q < N else None
                    cont = (p is not None and p.kind == 'punct' and p.text in OPERATOR_TAIL) or \
                           (nt is not None and nt.kind == 'punct' and nt.text in set('.([+-*/%?:=&|<>,^`'))
                    if not cont:
                        return j
                j += 1
                continue
            if at_base(t) and t.kind == 'punct' and t.text in (',', ';'):
                return j
            j += 1
        return N

    def pattern_names(j):
        """Shallow destructuring: identifiers inside a balanced {…}/[…] pattern that are
        followed by , } ] or =. Returns (names, index after the pattern)."""
        openers = {'{': '}', '[': ']'}
        close = openers[sig[j].text]
        lvl = 0
        names = []
        while j < N:
            t = sig[j]
            if t.kind == 'punct' and t.text in openers:
                lvl += 1
            elif t.kind == 'punct' and t.text in ('}', ']'):
                lvl -= 1
                if lvl == 0:
                    return names, j + 1
            elif t.kind == 'ident':
                q = nxt(j + 1)
                if q < N and sig[q].kind == 'punct' and sig[q].text in (',', '}', ']', '='):
                    names.append(t)
            j += 1
        return names, j

    while k < N:
        t = sig[k]
        if t.kind != 'ident' or not at_base(t):
            k += 1
            continue
        if t.text in DECL_KW:
            kind = t.text
            j = nxt(k + 1)
            while j < N:
                tj = sig[j]
                if tj.kind == 'ident':
                    decls.append({'name': tj.text, 'kind': kind, 'line': tj.line})
                    j = nxt(j + 1)
                elif tj.kind == 'punct' and tj.text in '{[':
                    names, j = pattern_names(j)
                    for nm in names:
                        decls.append({'name': nm.text, 'kind': kind, 'line': nm.line})
                    j = nxt(j)
                else:
                    break
                if j < N and sig[j].kind == 'punct' and sig[j].text == '=':
                    j = skip_initializer(j + 1)
                if j < N and sig[j].kind == 'punct' and sig[j].text == ',':
                    j = nxt(j + 1)
                    continue
                break
            k = max(j, k + 1)
            continue
        if t.text == 'function':
            j = nxt(k + 1)
            if j < N and sig[j].kind == 'punct' and sig[j].text == '*':
                j = nxt(j + 1)
            if j < N and sig[j].kind == 'ident':
                decls.append({'name': sig[j].text, 'kind': 'function', 'line': sig[j].line})
            k = j + 1
            continue
        if t.text == 'class':
            j = nxt(k + 1)
            if j < N and sig[j].kind == 'ident':
                decls.append({'name': sig[j].text, 'kind': 'class', 'line': sig[j].line})
            k = j + 1
            continue
        k += 1
    return decls


def references(toks):
    """Identifier tokens that can be references: not after '.', not object keys.
    Returns {name: [lines]}."""
    refs = {}
    N = len(toks)
    for idx, t in enumerate(toks):
        if t.kind != 'ident':
            continue
        p = idx - 1
        while p >= 0 and toks[p].kind == 'nl':
            p -= 1
        prev = toks[p] if p >= 0 else None
        if prev is not None and prev.kind == 'punct' and prev.text == '.':
            # `a.b` is a property access, but `...b` (spread/rest) is a reference to b
            spread = p >= 2 and toks[p - 1].kind == 'punct' and toks[p - 1].text == '.' and \
                toks[p - 2].kind == 'punct' and toks[p - 2].text == '.'
            if not spread:
                continue
        q = idx + 1
        while q < N and toks[q].kind == 'nl':
            q += 1
        nxt_t = toks[q] if q < N else None
        if prev is not None and prev.kind == 'punct' and prev.text in ('{', ',') and \
                nxt_t is not None and nxt_t.kind == 'punct' and nxt_t.text == ':':
            continue  # object-literal key
        refs.setdefault(t.text, []).append(t.line)
    return refs


def local_names(toks):
    """Every name declared anywhere in the file (any depth): the identifier after
    const/let/var/function/class, plus simple comma lists. Used only to keep function-local
    constants out of the 'unresolved' list."""
    names = set()
    N = len(toks)
    for i, t in enumerate(toks):
        if t.kind != 'ident' or t.text not in ('const', 'let', 'var', 'function', 'class'):
            continue
        j = i + 1
        while j < N and toks[j].kind == 'nl':
            j += 1
        if j < N and toks[j].kind == 'punct' and toks[j].text == '*':
            j += 1
        if j < N and toks[j].kind == 'ident':
            names.add(toks[j].text)
        # `const a=1,b=2`: pick up the identifiers that directly follow a ',' at the same depth
        if t.text in DECL_KW:
            k = j
            while k < N and not (toks[k].kind == 'punct' and toks[k].text == ';'):
                if toks[k].kind == 'punct' and toks[k].text == ',' and toks[k].depth == t.depth and \
                        toks[k].pdepth == t.pdepth and toks[k].bdepth == t.bdepth and k + 1 < N and toks[k + 1].kind == 'ident':
                    names.add(toks[k + 1].text)
                if toks[k].kind == 'nl' and toks[k].depth == t.depth:
                    break
                k += 1
    return names


BUILTIN_CAPS = {'JSON', 'NaN', 'URL', 'CSS', 'XMLHttpRequest', 'DOMParser', 'DOMException', 'HTMLElement', 'SVGElement'}


def read_source(path, name):
    with open(path, encoding='utf-8') as fh:
        code = fh.read()
    if name.endswith('.html'):
        # keep only the inline <script> bodies, masking the markup but keeping newlines
        out = [' ' if ch != '\n' else '\n' for ch in code]
        for m in re.finditer(r'<script\b[^>]*>(.*?)</script>', code, re.S | re.I):
            a, b = m.start(1), m.end(1)
            out[a:b] = list(code[a:b])
        code = ''.join(out)
    return code


# -------------------------------------------------------------------------------- main
def analyse(src_dir):
    files = {}
    present = [f for f in BUILD_ORDER if os.path.exists(os.path.join(src_dir, f))]
    extra = sorted(f for f in os.listdir(src_dir) if f.endswith('.js') and f not in present)
    for f in present + extra:
        code = read_source(os.path.join(src_dir, f), f)
        toks, masked = scan(code)
        iife = is_iife(masked) if f.endswith('.js') else False
        base_depth, base_pdepth = (1, 1) if iife else (0, 0)
        decls = declarations(toks, base_depth, base_pdepth)
        # Brace depth after the whole file: the number of code `{` minus the number of code `}`
        # the scanner emitted (template-literal `${…}` braces are masked, never emitted). A
        # non-zero value means a scanner slip or an unbalanced file. (The depth stored on a
        # token is the depth before it for `{` but after it for `}`, so the last token's depth
        # cannot be used for this.)
        end_depth = sum(1 for t in toks if t.kind == 'punct' and t.text == '{') - \
            sum(1 for t in toks if t.kind == 'punct' and t.text == '}')
        files[f] = {
            'scope': SCOPE_OF.get(f, 'page'),
            'wrapper': 'iife' if iife else ('inline <script>' if f.endswith('.html') else 'bare'),
            'balanced': end_depth == 0,
            'end_depth': end_depth,
            'decls': decls,
            'locals': local_names(toks),
            'refs': references(toks),
            'masked': masked,
            'handles_defined': sorted(set(re.findall(r'window\s*\.\s*(__\w+)\s*=[^=]', masked))),
            'handles_used': sorted(set(re.findall(r'window\s*\.\s*(__\w+)', masked))),
        }

    # declaration index: name -> [(file, kind, line)]
    index = {}
    for f, F in files.items():
        for d in F['decls']:
            index.setdefault(d['name'], []).append((f, d['kind'], d['line']))
    scope_files = {}
    for f, F in files.items():
        scope_files.setdefault(F['scope'], []).append(f)

    # resolve references
    used_by = {}      # (file, name) -> {using_file: count}
    matrix = {}       # using_file -> {declaring_file: set(names)}
    free = {}         # const-like identifiers that resolve nowhere: name -> {file: count}
    for g, G in files.items():
        own = {d['name'] for d in G['decls']}
        same_scope = [h for h in scope_files[G['scope']] if h != g]
        page_scope = [h for h in scope_files.get('page', []) if h != g]
        for name, lines in G['refs'].items():
            if name in own:
                continue
            target = None
            for h in same_scope:
                if any(d['name'] == name for d in files[h]['decls']):
                    target = h; break
            if target is None and G['scope'] != 'page':
                for h in page_scope:
                    if any(d['name'] == name for d in files[h]['decls']):
                        target = h; break
            if target is None:
                if CONST_LIKE.match(name) and name not in G['locals'] and name not in BUILTIN_CAPS:
                    free.setdefault(name, {})[g] = len(lines)
                continue
            used_by.setdefault((target, name), {})[g] = len(lines)
            matrix.setdefault(g, {}).setdefault(target, set()).add(name)

    # collisions
    collisions = []
    for name, where in index.items():
        if len(where) < 2:
            continue
        by_scope = {}
        for f, kind, line in where:
            by_scope.setdefault(files[f]['scope'], []).append((f, kind, line))
        for sc, lst in by_scope.items():
            if len(lst) > 1:
                fatal = any(k in ('const', 'let', 'class') for _, k, _ in lst)
                collisions.append({'name': name, 'type': 'same-scope', 'scope': sc, 'fatal': fatal,
                                   'where': [{'file': f, 'kind': k, 'line': l} for f, k, l in lst],
                                   'note': ('SyntaxError at load: redeclaration of a lexical binding'
                                            if fatal else 'silent override: the later declaration wins')})
        if len(by_scope) > 1:
            scopes = sorted(by_scope)
            typ = 'cross-iife' if 'page' not in scopes else 'shadowing'
            collisions.append({'name': name, 'type': typ, 'scope': '+'.join(scopes), 'fatal': False,
                               'where': [{'file': f, 'kind': k, 'line': l} for f, k, l in where],
                               'note': ('the same name in both IIFEs: a duplicated helper or two unrelated functions; harmless but confusing'
                                        if typ == 'cross-iife'
                                        else 'an IIFE-scoped name hides a page global of the same name')})
    collisions.sort(key=lambda c: (not c['fatal'], c['type'], c['name']))

    # unreferenced (never used by another file)
    unreferenced = []
    for f, F in files.items():
        for d in F['decls']:
            if not used_by.get((f, d['name'])):
                unreferenced.append({'file': f, 'name': d['name'], 'kind': d['kind'], 'line': d['line']})

    return files, index, used_by, matrix, collisions, unreferenced, free, present + extra


def short(f):
    return f.replace('.js', '').replace('data_', 'd_').replace('page.html', 'page')


def render_markdown(files, used_by, matrix, collisions, unreferenced, free, order, tables=True):
    L = []
    L.append('# Subhasta — global namespace map')
    L.append('')
    L.append('Generated by `tools/globals.py`. Scopes: **page** = the data files and `page.html`\'s inline '
             '`const NGA` (true globals); **app** = `app.js`\'s IIFE, into which ' + ', '.join(f'`{f}`' for f in APP_INNER) + ' '
             'are pasted by `build.py` (the list is read from it); **reel** = `reel.js`\'s own IIFE. '
             '"Used by" resolves each identifier to the nearest declaration (own file, then the same scope, '
             'then the page scope); property accesses (`x.name`) and object-literal keys are excluded. '
             'This is a tokenizer, not a parser, so treat it as a close approximation; `test.js` is the '
             'authority on what actually loads.')
    L.append('')
    tot = sum(len(F['decls']) for F in files.values())
    L.append(f'Files scanned: {len(files)} · top-level declarations: {tot} · collisions: '
             f'{len([c for c in collisions if c["fatal"]])} fatal, '
             f'{len([c for c in collisions if not c["fatal"]])} non-fatal · '
             f'declared but never used by another file: {len(unreferenced)}')
    L.append('')
    bad = [f for f, F in files.items() if F['end_depth'] != 0]
    if bad:
        L.append(f'> Scanner warning: brace depth did not return to zero in {", ".join(bad)}; '
                 'the declarations of those files may be incomplete.')
        L.append('')

    if tables:
        L.append('## 1. Declarations per file')
        L.append('')
        for f in order:
            F = files[f]
            L.append(f'### `src/{f}` — scope **{F["scope"]}**, {F["wrapper"]}, {len(F["decls"])} declarations')
            L.append('')
            if not F['decls']:
                L.append('_none_')
                L.append('')
                continue
            L.append('| name | kind | line | used by |')
            L.append('|---|---|---:|---|')
            for d in F['decls']:
                ub = used_by.get((f, d['name']), {})
                cell = ', '.join(f'{short(g)} ({n})' for g, n in sorted(ub.items(), key=lambda x: -x[1])) or '—'
                L.append(f'| `{d["name"]}` | {d["kind"]} | {d["line"]} | {cell} |')
            L.append('')

    L.append('## 2. Collisions')
    L.append('')
    if not collisions:
        L.append('None: no name is declared twice in the same scope, no IIFE name shadows a page global, '
                 'and the two IIFEs share no helper name.')
    else:
        L.append('| name | type | scope | fatal | declared in | note |')
        L.append('|---|---|---|---|---|---|')
        for c in collisions:
            where = '; '.join(f'{w["file"]}:{w["line"]} ({w["kind"]})' for w in c['where'])
            L.append(f'| `{c["name"]}` | {c["type"]} | {c["scope"]} | {"**yes**" if c["fatal"] else "no"} | {where} | {c["note"]} |')
    L.append('')

    L.append('## 3. Declared but never referenced by another file')
    L.append('')
    L.append('Informational. In the IIFE scopes most names are meant to be local; in the **page** scope a '
             'name nobody else reads is dead data (or read only by its own file, e.g. `IMG` by `CREDIT`).')
    L.append('')
    for sc in ('page', 'app', 'reel'):
        rows = [u for u in unreferenced if files[u['file']]['scope'] == sc]
        if not rows:
            continue
        L.append(f'**{sc}** ({len(rows)}): ' + ', '.join(f'`{u["name"]}` ({short(u["file"])}:{u["line"]})' for u in rows))
        L.append('')

    L.append('## 4. Dependency matrix')
    L.append('')
    L.append('Rows use, columns declare; a cell is the number of distinct names of the column file that the '
             'row file references. Evaluation order in the built page runs top to bottom, so a row that '
             'depends on a column further down the list is a forward reference (fine inside functions '
             'that run after load, fatal at the top level of a data file).')
    L.append('')
    cols = [f for f in order if any(f in m for m in matrix.values())]
    L.append('| uses \\ declares | ' + ' | '.join(short(c) for c in cols) + ' |')
    L.append('|---|' + '---|' * len(cols))
    for g in order:
        row = matrix.get(g, {})
        if not row:
            continue
        L.append(f'| **{short(g)}** | ' + ' | '.join(str(len(row[c])) if c in row else '·' for c in cols) + ' |')
    L.append('')
    L.append('As a list:')
    L.append('')
    for g in order:
        row = matrix.get(g, {})
        if not row:
            continue
        parts = []
        for h in order:
            if h in row:
                names = sorted(row[h])
                shown = ', '.join(f'`{x}`' for x in names[:8]) + (f' … (+{len(names) - 8})' if len(names) > 8 else '')
                parts.append(f'{short(h)} [{len(names)}: {shown}]')
        L.append(f'- **{short(g)}** → ' + '; '.join(parts))
    L.append('')

    L.append('## 5. `window.__*` handles')
    L.append('')
    for f in order:
        F = files[f]
        if F['handles_defined'] or F['handles_used']:
            L.append(f'- `{f}`: defines {", ".join("`window." + h + "`" for h in F["handles_defined"]) or "—"}; '
                     f'reads {", ".join("`window." + h + "`" for h in F["handles_used"] if h not in F["handles_defined"]) or "—"}')
    L.append('')

    L.append('## 6. Constant-looking identifiers that resolve to no declaration')
    L.append('')
    if not free:
        L.append('None.')
    else:
        L.append('Either a browser/host global or a typo; check each.')
        L.append('')
        for name, where in sorted(free.items()):
            L.append(f'- `{name}`: ' + ', '.join(f'{short(g)} ({n})' for g, n in where.items()))
    L.append('')
    return '\n'.join(L)


def main():
    ap = argparse.ArgumentParser(description='Global-namespace map of the Subhasta sources.')
    ap.add_argument('--json', action='store_true', help='print JSON instead of Markdown')
    ap.add_argument('--no-tables', action='store_true', help='omit the per-file tables')
    ap.add_argument('--src', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src'),
                    help='source folder (default: ../src)')
    args = ap.parse_args()
    src = os.path.abspath(args.src)
    if not os.path.isdir(src):
        print(f'source folder not found: {src}', file=sys.stderr)
        sys.exit(2)
    files, index, used_by, matrix, collisions, unreferenced, free, order = analyse(src)
    if args.json:
        out = {
            'note': 'Tokenizer-based approximation: identifiers not preceded by "." and not object keys, '
                    'resolved own file → same scope → page scope. See the script header.',
            'files': {f: {'scope': F['scope'], 'wrapper': F['wrapper'],
                          'declarations': [{**d, 'used_by': used_by.get((f, d['name']), {})} for d in F['decls']],
                          'window_handles_defined': F['handles_defined'],
                          'window_handles_used': F['handles_used']} for f, F in files.items()},
            'collisions': collisions,
            'unreferenced': unreferenced,
            'dependencies': {g: {h: sorted(names) for h, names in row.items()} for g, row in matrix.items()},
            'unresolved_constants': free,
        }
        print(json.dumps(out, ensure_ascii=False, indent=1))
    else:
        print(render_markdown(files, used_by, matrix, collisions, unreferenced, free, order, tables=not args.no_tables))
    sys.exit(1 if any(c['fatal'] for c in collisions) else 0)


if __name__ == '__main__':
    main()
