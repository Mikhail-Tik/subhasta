#!/usr/bin/env python3
"""tools/benchmarks.py — the Lab's benchmarks: S&P 500 total return, the S&P 500 price index, gold and US CPI.

    python3 tools/benchmarks.py                 download the three CSVs and write src/data_bench.js
    python3 tools/benchmarks.py --from DIR      read local copies instead (any file in DIR whose name ends
                                                with data.csv, monthly.csv and cpiai.csv respectively)
    python3 tools/benchmarks.py --dry-run       compute and print the summary; write nothing

Inputs (public domain, Open Data Commons PDDL; standard library only, no API key):
  S&P 500   https://raw.githubusercontent.com/datasets/s-and-p-500/main/data/data.csv
            Robert Shiller's monthly data (price = the month's average of daily closes, dividend per share
            annualised, CPI), extended with FRED's monthly S&P 500 after Shiller's last month. The dividend
            column stops in June 2023 (0.0 afterwards) and the CPI column in September 2023.
  Gold      https://raw.githubusercontent.com/datasets/gold-prices/main/data/monthly.csv
            US$ per troy ounce, monthly (World Bank Pink Sheet, earlier years Timothy Green).
  CPI       https://raw.githubusercontent.com/datasets/cpi-us/main/data/cpiai.csv
            BLS CPI-U, all items, 1982-84 = 100, monthly from January 1913.

Output: src/data_bench.js, one constant
  const BENCH={years:[1871…], sp:[…], spx:[…], gold:[…], cpi:[…], meta:{generated, through:{sp, gold, cpi, div}, months, missing, vf, note}, src:{sp, gold, cpi}};
(meta.months: how many months the last year averages; meta.missing: months an input never published; meta.vf: the terminal's
V/S/U flag for the series, S, since they are repackaged compilations read as published.)
every series an ANNUAL AVERAGE of monthly values, one value per year, the arrays aligned on `years`.
  sp    total-return index: TR(t) = TR(t-1) × (P(t) + D(t)/12) / P(t-1), TR(1871-01) = P(1871-01); the dividend is
        reinvested monthly at one twelfth of the annualised rate. After the last reported dividend (June 2023)
        the dividend is held at that annual rate in dollars a share, so recent total returns are slightly
        understated (the yield falls as the price rises).
  spx   the price index alone (the same monthly values).
  gold  US$ per troy ounce.
  cpi   Shiller's CPI before 1913 (spliced by Shiller from the Warren-Pearson index), BLS CPI-U from 1913.
        The join is checked: on the overlap the two must agree within 0.1% for every month Shiller reports
        as final (his last months are estimates), or the script stops.
The current year is the average of the months published so far (stated in meta.note and meta.through).

The script refuses to write when a series has a gap, a non-positive value, the years are not contiguous,
the output exceeds 12 KB, or the CPI join fails. tools/lint_data.js checks the shape of the result.
"""
import argparse, csv, datetime, io, math, pathlib, sys, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'src' / 'data_bench.js'
URLS = {
    'sp': 'https://raw.githubusercontent.com/datasets/s-and-p-500/main/data/data.csv',
    'gold': 'https://raw.githubusercontent.com/datasets/gold-prices/main/data/monthly.csv',
    'cpi': 'https://raw.githubusercontent.com/datasets/cpi-us/main/data/cpiai.csv',
}
SUFFIX = {'sp': 'data.csv', 'gold': 'monthly.csv', 'cpi': 'cpiai.csv'}
LABELS = {
    'sp': 'S&P 500 with dividends: Robert Shiller’s monthly data extended with FRED (datasets/s-and-p-500, ODC-PDDL)',
    'gold': 'Gold, US$ per troy ounce, monthly: World Bank Pink Sheet and Timothy Green (datasets/gold-prices, ODC-PDDL)',
    'cpi': 'US consumer prices, CPI-U, BLS (datasets/cpi-us, ODC-PDDL); Shiller’s CPI before 1913',
}
FIRST_YEAR = 1871
MAX_BYTES = 12 * 1024
# the terminal's verification flag for the series: S, a reputable secondary source. The three inputs are repackaged compilations
# (Open Knowledge's core datasets of Shiller/FRED, World Bank and BLS data), read as published and checked only for internal
# consistency (the CPI join, gaps, signs), not re-checked against the primary releases.
VF = 'S'
MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']


def fetch(key, local_dir):
    """The CSV text for one input: from a local directory when given, else downloaded."""
    if local_dir:
        hits = sorted(p for p in pathlib.Path(local_dir).iterdir() if p.is_file() and p.name.endswith(SUFFIX[key]))
        if not hits:
            raise SystemExit(f'--from {local_dir}: no file ending in {SUFFIX[key]}')
        return hits[0].read_text(encoding='utf-8')
    with urllib.request.urlopen(URLS[key], timeout=60) as r:
        if r.status != 200:
            raise SystemExit(f'{URLS[key]}: HTTP {r.status}')
        return r.read().decode('utf-8')


def rows(text):
    return list(csv.DictReader(io.StringIO(text)))


def month(s):
    """'1871-01-01' or '1871-01' -> '1871-01'"""
    s = s.strip()
    if len(s) < 7 or s[4] != '-':
        raise SystemExit(f'unexpected date {s!r}')
    return s[:7]


def num(s):
    s = (s or '').strip()
    return float(s) if s else 0.0


def missing(months):
    """The YYYY-MM keys absent between the first and the last of a sorted list."""
    out, (y, m) = [], map(int, months[0].split('-'))
    have = set(months)
    while f'{y:04d}-{m:02d}' != months[-1]:
        m += 1
        if m == 13:
            y, m = y + 1, 1
        k = f'{y:04d}-{m:02d}'
        if k not in have:
            out.append(k)
    return out


def contiguous(months):
    """True when the YYYY-MM keys run month by month with no gap."""
    return not missing(months)


def annual(series):
    """{YYYY-MM: value} -> {year: average of that year's months}, {year: number of months}"""
    acc = {}
    for k, v in series.items():
        acc.setdefault(int(k[:4]), []).append(v)
    return {y: sum(vs) / len(vs) for y, vs in acc.items()}, {y: len(vs) for y, vs in acc.items()}


def fmt(v):
    """six significant figures, no exponent, no trailing zeros"""
    if v >= 1e5:
        return str(int(round(v)))
    d = max(0, 5 - int(math.floor(math.log10(v))))
    s = f'{v:.{d}f}'
    return s.rstrip('0').rstrip('.') if '.' in s else s


def mlabel(k):
    y, m = k.split('-')
    return f'{MON[int(m) - 1]} {y}'


def main():
    ap = argparse.ArgumentParser(description='Write src/data_bench.js (S&P 500 total return and price, gold, CPI; annual averages).')
    ap.add_argument('--from', dest='local', metavar='DIR', help='read local copies of the three CSVs from DIR')
    ap.add_argument('--dry-run', action='store_true', help='print the summary; do not write')
    ap.add_argument('--out', default=str(OUT), help='output path (default src/data_bench.js)')
    a = ap.parse_args()

    # ---- S&P 500: price, dividend, Shiller's CPI ----
    sp_rows = rows(fetch('sp', a.local))
    price, div, scpi = {}, {}, {}
    for r in sp_rows:
        k = month(r['Date'])
        p = num(r.get('SP500'))
        if p > 0:
            price[k] = p
        d = num(r.get('Dividend'))
        if d > 0:
            div[k] = d
        c = num(r.get('Consumer Price Index'))
        if c > 0:
            scpi[k] = c
    pm = sorted(price)
    if not pm or pm[0] != f'{FIRST_YEAR}-01' or not contiguous(pm):
        raise SystemExit('S&P 500: the monthly prices must run without a gap from January 1871')
    div_last = max(div)
    if any(k not in div for k in pm if k <= div_last):
        raise SystemExit('S&P 500: a month before the last reported dividend has no dividend')
    held = div[div_last]
    tr, prev = {}, None
    for k in pm:
        if prev is None:
            tr[k] = price[k]
        else:
            d = div.get(k, held if k > div_last else 0.0)
            tr[k] = tr[prev] * (price[k] + d / 12.0) / price[prev]
        prev = k
    shiller_end = max(scpi)

    # ---- gold ----
    gold = {}
    for r in rows(fetch('gold', a.local)):
        v = num(r.get('Price'))
        if v > 0:
            gold[month(r['Date'])] = v
    gm = sorted(k for k in gold if int(k[:4]) >= FIRST_YEAR)
    if not gm or gm[0] != f'{FIRST_YEAR}-01' or not contiguous(gm):
        raise SystemExit('gold: the monthly prices must run without a gap from January 1871')
    gold = {k: gold[k] for k in gm}

    # ---- CPI: Shiller before 1913, BLS from 1913; check the join ----
    bls = {}
    for r in rows(fetch('cpi', a.local)):
        v = num(r.get('Index'))
        if v > 0:
            bls[month(r['Date'])] = v
    bm = sorted(bls)
    if not bm or bm[0] != '1913-01':
        raise SystemExit('CPI: the BLS series must start in January 1913')
    # BLS published no CPI for October 2025 (the federal shutdown): a month the agency never released is left out,
    # not invented; that year averages the months published. More than two missing months stops the script.
    bls_gap = missing(bm)
    if len(bls_gap) > 2:
        raise SystemExit(f'CPI: {len(bls_gap)} months missing from the BLS series ({", ".join(bls_gap[:6])}…)')
    overlap = [k for k in bm if k in scpi]
    rel = {k: scpi[k] / bls[k] - 1 for k in overlap}
    # Shiller's last months are estimates: the join must hold to within 0.1% on every month up to the last month that agrees within 0.01%
    exact = [k for k in overlap if abs(rel[k]) <= 1e-4]
    if not exact:
        raise SystemExit('CPI join: Shiller’s CPI and the BLS CPI-U never agree on the overlap')
    agree_to = max(exact)
    bad = [k for k in overlap if k <= agree_to and abs(rel[k]) > 1e-3]
    if bad:
        raise SystemExit(f'CPI join: {len(bad)} months differ by more than 0.1% (first {bad[0]}: Shiller {scpi[bad[0]]}, BLS {bls[bad[0]]})')
    cpi = {k: v for k, v in scpi.items() if k < '1913-01'}
    cpi.update(bls)
    cm = sorted(cpi)
    if cm[0] != f'{FIRST_YEAR}-01' or missing(cm) != bls_gap:
        raise SystemExit('CPI: the spliced series has a gap at the join')

    # ---- annual averages, aligned on the years every series covers ----
    A = {}
    N = {}
    for key, ser in (('sp', tr), ('spx', price), ('gold', gold), ('cpi', cpi)):
        A[key], N[key] = annual(ser)
    last = min(max(A[k]) for k in A)
    years = list(range(FIRST_YEAR, last + 1))
    for k in A:
        miss = [y for y in years if y not in A[k] or not A[k][y] > 0]
        if miss:
            raise SystemExit(f'{k}: no positive value for {miss[:5]}')
    through = {'sp': pm[-1], 'gold': gm[-1], 'cpi': cm[-1], 'div': div_last}
    partial = {k: N[k][last] for k in A if N[k][last] < 12}

    # ---- the note: how the series were made, in the house style (typographic apostrophes, no straight quotes) ----
    agree_months = sum(1 for k in overlap if k <= agree_to)
    part = ''
    if bls_gap:
        part += (f' BLS published no index for {", ".join(mlabel(k) for k in bls_gap)}; '
                 + ', '.join(sorted({k[:4] for k in bls_gap})) + ' averages the months it did publish.')
    if partial:
        part += (f' {last} is the average of the months published so far: the S&P 500 to {mlabel(through["sp"])}, gold to {mlabel(through["gold"])}, '
                 f'CPI to {mlabel(through["cpi"])}.')
    note = (f'Annual averages of monthly values, {FIRST_YEAR}–{last}. S&P 500 total return: the monthly index (Shiller to {mlabel(shiller_end)}, FRED after) '
            f'with the annualised dividend reinvested monthly, one twelfth a month; the dividend series ends in {mlabel(div_last)} at {held:.2f} dollars a share '
            f'and is held at that rate since, so recent total returns are slightly understated. Price index: the same months without dividends. '
            f'Gold: US dollars per troy ounce. CPI: Shiller’s index before 1913 (Warren–Pearson), BLS CPI-U (1982–84 = 100) from 1913; '
            f'the two agree within 0.01% on {agree_months:,} months, January 1913 to {mlabel(agree_to)}.' + part)
    for bad_s in ("'", '"', 'undefined', 'NaN'):
        if bad_s in note:
            raise SystemExit(f'note contains {bad_s!r}')

    js_arr = lambda key: '[' + ','.join(fmt(A[key][y]) for y in years) + ']'
    js_str = lambda s: "'" + s.replace('\\', '\\\\').replace("'", '’') + "'"
    generated = datetime.date.today().isoformat()
    out = (
        '// SUBHASTA — benchmarks for the Lab: generated by tools/benchmarks.py from public-domain open data (ODC-PDDL). Do not edit by hand.\n'
        f'// Annual averages, {FIRST_YEAR}–{last}; rerun python3 tools/benchmarks.py to refresh. sp = S&P 500 total return (dividends reinvested), spx = price index,\n'
        '// gold = US$ per troy ounce, cpi = US CPI (1982–84 = 100). The arrays are aligned on years; meta.through gives the last month in each input.\n'
        'const BENCH={\n'
        f'years:[{",".join(str(y) for y in years)}],\n'
        f'sp:{js_arr("sp")},\n'
        f'spx:{js_arr("spx")},\n'
        f'gold:{js_arr("gold")},\n'
        f'cpi:{js_arr("cpi")},\n'
        f'meta:{{generated:{js_str(generated)},through:{{sp:{js_str(through["sp"])},gold:{js_str(through["gold"])},cpi:{js_str(through["cpi"])},div:{js_str(through["div"])}}},'
        f'months:{{sp:{N["sp"][last]},gold:{N["gold"][last]},cpi:{N["cpi"][last]}}},missing:{{cpi:[{",".join(js_str(k) for k in bls_gap)}]}},vf:{js_str(VF)},note:{js_str(note)}}},\n'
        f'src:{{sp:[{js_str(LABELS["sp"])},{js_str(URLS["sp"])}],gold:[{js_str(LABELS["gold"])},{js_str(URLS["gold"])}],cpi:[{js_str(LABELS["cpi"])},{js_str(URLS["cpi"])}]}}\n'
        '};\n'
    )
    size = len(out.encode('utf-8'))
    if size > MAX_BYTES:
        raise SystemExit(f'output is {size:,} bytes, above the {MAX_BYTES:,}-byte budget')

    cagr = lambda key, y0, y1: (A[key][y1] / A[key][y0]) ** (1 / (y1 - y0)) - 1
    print(f'BENCH {FIRST_YEAR}–{last}: {len(years)} years, {size:,} bytes; through sp {through["sp"]}, gold {through["gold"]}, cpi {through["cpi"]}, dividend {through["div"]} (held at {held:.2f})')
    print(f'CPI join: {len(overlap)} overlapping months, agree within 0.01% to {agree_to}; largest gap after that {max((abs(rel[k]) for k in overlap if k > agree_to), default=0) * 100:.2f}%')
    for y0 in (last - 10, last - 30):
        print(f'  {y0}–{last}: S&P total return {cagr("sp", y0, last) * 100:.2f}% a year, price {cagr("spx", y0, last) * 100:.2f}%, gold {cagr("gold", y0, last) * 100:.2f}%, CPI {cagr("cpi", y0, last) * 100:.2f}%')
    # gold was a fixed official price until 1968: a large annual move then is either policy (1933–34) or a slip in the source; printed, never patched
    jumps = [f'{y} {(A["gold"][y] / A["gold"][y - 1] - 1) * 100:+.0f}%' for y in years[1:] if y < 1968 and abs(A['gold'][y] / A['gold'][y - 1] - 1) > .1]
    if jumps:
        print('NOTE gold, fixed-price era, annual moves above 10% (check against the source; 1933–34 is the dollar’s devaluation): ' + ', '.join(jumps))
    if a.dry_run:
        print('dry run: nothing written')
        return
    pathlib.Path(a.out).write_text(out, encoding='utf-8')
    print(f'wrote {a.out}')


if __name__ == '__main__':
    main()
