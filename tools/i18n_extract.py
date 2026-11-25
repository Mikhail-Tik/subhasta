#!/usr/bin/env python3
"""Collect the English texts of the historical layer for translation (v35).

    python3 -I tools/i18n_extract.py

Reads src/data_history.js (HISTORY, WORLD_NOW, HIST_PICS, MOVE_TODAY), src/data_objects.js (OBJECTS), src/data_movements.js
(MOVEMENTS) and docs/hist/all.json (the polities' names) through node, and writes data/i18n/src/<part>-<n>.json: {"key": "English"},
chunked to about 60 KB. A key names the row and the field ("ev.out-of-africa.t", "cent.-3000.life", "pol.Egypt"), so the
translation in data/i18n/ru/<same file> (same keys, Russian values) is applied to the same field by tools/gen_i18n.py."""
import json, pathlib, subprocess
root = pathlib.Path(__file__).resolve().parent.parent
js = r'''
const fs=require("fs"),vm=require("vm");const ctx={};vm.createContext(ctx);
for(const f of ["src/data_history.js","src/data_objects.js","src/data_movements.js"]){try{vm.runInContext(fs.readFileSync(f,"utf8").replace(/^(const|let) /gm,"var "),ctx);}catch(e){console.error(f,e.message);}}
const out={};const put=(k,v)=>{if(typeof v==="string"&&v.trim()&&!/^https?:/.test(v))out[k]=v;};
const H=ctx.HISTORY||{};
for(const e of H.events||[]){put(`ev.${e.id}.n`,e.n);put(`ev.${e.id}.t`,e.t);}
for(const c of H.centuries||[]){for(const f of ["n","moved","art","life","food","smell","trouble"])put(`cent.${c.y}.${f}`,c[f]);(c.powers||[]).forEach((p,i)=>{put(`cent.${c.y}.powers.${i}.n`,p.n);put(`cent.${c.y}.powers.${i}.cap`,p.cap);put(`cent.${c.y}.powers.${i}.t`,p.t);});}
for(const w of H.wonders||[]){put(`won.${w.id}.n`,w.n);put(`won.${w.id}.t`,w.t);}
for(const p of H.people||[]){for(const f of ["n","city","role","t"])put(`ppl.${p.id}.${f}`,p[f]);(p.works||[]).forEach((w,i)=>{put(`ppl.${p.id}.works.${i}.t`,w.t);put(`ppl.${p.id}.works.${i}.n`,w.n);});}
for(const c of H.cities||[]){put(`cty.${c.id}.n`,c.n);(c.moments||[]).forEach((m,i)=>{put(`cty.${c.id}.m.${i}.n`,m.n);put(`cty.${c.id}.m.${i}.t`,m.t);});}
const W=ctx.WORLD_NOW||{};for(const c of W.conflicts||[]){for(const f of ["n","parties","t"])put(`con.${c.id}.${f}`,c[f]);}for(const e of W.events||[]){put(`wev.${e.id}.n`,e.n);put(`wev.${e.id}.t`,e.t);}
for(const [k,p] of Object.entries(ctx.HIST_PICS||{})){put(`pic.${k}.t`,p.t);}
for(const [k,m] of Object.entries(ctx.MOVE_TODAY||{})){(m.owners||[]).forEach((o,i)=>{put(`mvt.${k}.o.${i}.n`,o.n);put(`mvt.${k}.o.${i}.what`,o.what);});if(typeof m.sync==="string")put(`mvt.${k}.sync`,m.sync);else if(m.sync&&typeof m.sync==="object")for(const [f,v] of Object.entries(m.sync))if(typeof v==="string")put(`mvt.${k}.sync.${f}`,v);}
const O=ctx.OBJECTS||{};for(const c of O.categories||[])put(`obc.${c.id}.n`,c.n);for(const o of O.objects||[]){for(const f of ["n","place","maker","made","count","t"])put(`obj.${o.id}.${f}`,o[f]);}
const M=ctx.MOVEMENTS||[];for(const m of M){for(const [f,v] of Object.entries(m))if(typeof v==="string"&&v.length>1&&!["id","img","color","hue"].includes(f))put(`mov.${m.id}.${f}`,v);}
process.stdout.write(JSON.stringify(out));
'''
units = json.loads(subprocess.run(['node', '-e', js], cwd=root, capture_output=True, text=True, check=True).stdout)
# the polities' names of every year
allf = root / 'docs' / 'hist' / 'all.json'
if allf.exists():
    A = json.load(open(allf, encoding='utf-8'))
    names = set()
    for sn in (A.get('snaps') or {}).values():
        for p in sn.get('polities') or []:
            for f in ('n', 'sub'):
                if isinstance(p.get(f), str) and p[f].strip(): names.add(p[f].strip())
    for n in sorted(names): units[f'pol.{n}'] = n
# chunk by part, about 60 KB of English each
parts = {}
for k, v in units.items(): parts.setdefault(k.split('.', 1)[0], []).append((k, v))
out_dir = root / 'data' / 'i18n' / 'src'
for f in out_dir.glob('*.json'): f.unlink()
written = []
for part, rows in parts.items():
    chunk, size, n = {}, 0, 1
    for k, v in rows:
        if size > 60000:
            (out_dir / f'{part}-{n}.json').write_text(json.dumps(chunk, ensure_ascii=False, indent=0), encoding='utf-8'); written.append((f'{part}-{n}', len(chunk), size)); chunk, size, n = {}, 0, n + 1
        chunk[k] = v; size += len(v.encode('utf-8'))
    if chunk: (out_dir / f'{part}-{n}.json').write_text(json.dumps(chunk, ensure_ascii=False, indent=0), encoding='utf-8'); written.append((f'{part}-{n}', len(chunk), size))
tot = sum(s for _, _, s in written)
for w in written: print(f'  {w[0]}: {w[1]} texts, {w[2]//1024} KB')
print(f'{len(units)} texts, {tot//1024} KB of English in {len(written)} files')
