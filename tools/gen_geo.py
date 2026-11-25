#!/usr/bin/env python3
"""Write src/data_geo.js (v36): the physical map of the historical globe — rivers, lakes and reservoirs (with the year each dam closed),
seas, mountain ranges, plains, deserts, peninsulas and peaks, from Natural Earth (public domain), with Russian names.

    python3 -I tools/gen_geo.py [cache_dir]

Downloads the Natural Earth GeoJSON files from github.com/nvkelso/natural-earth-vector (once, into cache_dir), keeps Eurasia in detail
(1:10m rivers and lakes from 15°E to 180°, 36°N to 78°N) and the rest of the world in outline (1:50m, the larger features), simplifies
the lines (Douglas–Peucker), and encodes each line as integers in hundredths of a degree, the first point whole and the rest as steps.
Russian names: Natural Earth's own (lakes, seas, regions, peaks); rivers from RIVER_RU below (Natural Earth has none for rivers); a
feature with no Russian name is drawn without a label in Russian. Writes `const GEO_NE = {...}` and prints the counts and the size."""
import json, math, pathlib, sys, urllib.request
root = pathlib.Path(__file__).resolve().parent.parent
cache = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'build' / 'ne'
cache.mkdir(parents=True, exist_ok=True)
BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/'
def get(name):
    f = cache / (name + '.geojson')
    if not f.exists():
        with urllib.request.urlopen(BASE + name + '.geojson', timeout=120) as r: f.write_bytes(r.read())
    return json.load(open(f, encoding='utf-8'))['features']

RIVER_RU = {
 'Lena': 'Лена', 'Selenga': 'Селенга', 'Selenge (Selenga)': 'Селенга', 'Angara': 'Ангара', 'Danube': 'Дунай', 'Donau': 'Дунай', 'Irtysh': 'Иртыш', 'Ertis': 'Иртыш',
 'Ertix': 'Иртыш', 'Ob': 'Обь', 'Al Furat': 'Евфрат', 'Firat': 'Евфрат', 'Euphrates': 'Евфрат', 'Hailar': 'Хайлар', 'Heilong Jiang': 'Амур', 'Argun’': 'Аргунь',
 'Amur': 'Амур', 'Volga': 'Волга', 'Huang': 'Хуанхэ', 'Malyy Yenisey': 'Малый Енисей', 'Kyzyl-Khem': 'Кызыл-Хем', 'Dnepre': 'Днепр', 'Dnipro': 'Днепр',
 'Sukhona': 'Сухона', 'Dicle': 'Тигр', 'Tigris': 'Тигр', 'Severnaya Dvina': 'Северная Двина', 'Oder': 'Одер', 'Verkhniy Yenisey': 'Верхний Енисей',
 'Yenisey': 'Енисей', 'Pechora': 'Печора', 'Kolyma': 'Колыма', 'Aldan': 'Алдан', 'Ural': 'Урал', 'Neva': 'Нева', 'Pamir': 'Памир', 'Svir': 'Свирь', 'Svir’': 'Свирь',
 'Naryn': 'Нарын', 'Vychegda': 'Вычегда', 'Panj': 'Пяндж', 'Daugava': 'Западная Двина', 'Vistula': 'Висла', 'Amu  Darya': 'Амударья', 'Tobol': 'Тобол',
 'Indigirka': 'Индигирка', 'Syr  Darya': 'Сырдарья', 'Syr Darya': 'Сырдарья', 'Lower Tunguska': 'Нижняя Тунгуска', 'Khatanga': 'Хатанга', 'Chulyshman': 'Чулышман',
 'Vuoksi': 'Вуокса', 'Tisa': 'Тиса', 'Tisza': 'Тиса', 'Biya': 'Бия', 'Kem': 'Кемь', 'Kemijoki': 'Кемийоки', 'Kheta': 'Хета', 'Kamchatka': 'Камчатка', 'Liao': 'Ляохэ',
 'Tom’': 'Томь', 'Anadyr’': 'Анадырь', 'Tarim': 'Тарим', 'Songhua': 'Сунгари', 'Taz': 'Таз', 'Dniester': 'Днестр', 'Kama': 'Кама', 'Don': 'Дон', 'Olenëk': 'Оленёк',
 'Vilyuy': 'Вилюй', 'Tuloma': 'Тулома', 'Neman': 'Неман', 'Narva': 'Нарва', 'Onega': 'Онега', 'Suda': 'Суда', 'Anabar': 'Анабар', 'Nadym': 'Надым', 'Velikaya': 'Великая',
 'Shilka': 'Шилка', 'Pyasina': 'Пясина', 'Ingoda': 'Ингода', 'Katun': 'Катунь', 'Pripyat': 'Припять', 'Yana': 'Яна', 'Neris': 'Вилия', 'Kuban': 'Кубань', 'Mezen': 'Мезень',
 'Prut': 'Прут', 'Ussuri': 'Уссури', 'Khopr': 'Хопёр', 'Ile': 'Или', 'Pur': 'Пур', 'Omolon': 'Омолон', 'Sava': 'Сава', 'Morava': 'Морава', 'Ishim': 'Ишим', 'Esil': 'Ишим',
 'Donets': 'Северский Донец', 'Zeya': 'Зея', 'Desna': 'Десна', 'Podkamennaya Tunguska': 'Подкаменная Тунгуска', 'Kotuy': 'Котуй', 'Olëkma': 'Олёкма', 'Vitim': 'Витим',
 'Chulym': 'Чулым', 'Oka': 'Ока', 'Kureyka': 'Курейка', 'Tumnin': 'Тумнин', 'Uda': 'Уда', 'Bikin': 'Бикин', 'Vishera': 'Вишера', 'Zarafshon': 'Зеравшан',
 'Bol’shoy Anyuy': 'Большой Анюй', 'Luza': 'Луза', 'Popigay': 'Попигай', 'Bol’shoy Yenisey': 'Большой Енисей', 'Mana': 'Мана', 'Aras': 'Аракс', 'Amgun’': 'Амгунь',
 'Sura': 'Сура', 'Adycha': 'Адыча', 'Southern Bug': 'Южный Буг', 'Chusovaya': 'Чусовая', 'Severnaya Sos’va': 'Северная Сосьва', 'Onon': 'Онон', 'Warta': 'Варта',
 'Bug': 'Западный Буг', 'Orhon': 'Орхон', 'Vakh': 'Вах', 'Maya': 'Мая', 'Alazeya': 'Алазея', 'Kura': 'Кура', 'Chuna': 'Чуна', 'Sheksna': 'Шексна', 'Tvertsa': 'Тверца',
 'Kola': 'Кола', 'Volkhov': 'Волхов', 'Seym': 'Сейм', 'Tsna': 'Цна', 'Vym': 'Вымь', 'Unzha': 'Унжа', 'Penzhina': 'Пенжина', 'Usa': 'Уса', 'Selemdzha': 'Селемджа',
 'Msta': 'Мста', 'Pinega': 'Пинега', 'Herlen': 'Керулен', 'Chara': 'Чара', 'Uchur': 'Учур', 'Tura': 'Тура', 'Vasyugan': 'Васюган', 'Markha': 'Марха', 'Vyatka': 'Вятка',
 'Belaya': 'Белая', 'Moma': 'Мома', 'Kukhtuy': 'Кухтуй', 'Dulgalakh': 'Дулгалах', 'Kondoma': 'Кондома', 'Malaya Ob': 'Малая Обь', 'Nizhnyaya Taymyra': 'Нижняя Таймыра',
 'Verkhnyaya Taymyra': 'Верхняя Таймыра', 'Bol’shaya Kuonamka': 'Большая Куонамка', 'Sartang': 'Сартанг', 'Atrek': 'Атрек', 'Evros': 'Марица', 'Sakarya': 'Сакарья',
 'Drina': 'Дрина', 'Mures': 'Муреш', 'Olt': 'Олт', 'Yalu': 'Ялуцзян', 'Nakdong': 'Нактонган', 'Ozhogina': 'Ожогина', 'Selennyakh': 'Селеннях', 'Tumen': 'Туманная',
 'Sanggan': 'Сангань', 'Yongding': 'Юндинхэ', 'Hai': 'Хайхэ', 'Luan': 'Луаньхэ', 'Fen': 'Фэньхэ', 'Nen': 'Нэньцзян', 'Xar Moron': 'Шара-Мурэн', 'Xiliao': 'Силяохэ',
 'Konqi': 'Кончедарья', 'Yarkant': 'Яркенд', 'Aksu': 'Аксу', 'Yurungkax': 'Юрункаш', 'Qarqan': 'Черчен', 'Ishikari': 'Исикари', 'Mogami': 'Могами', 'Tone': 'Тонэ',
 'Poronay': 'Поронай', 'Tornelven': 'Турнеэльвен', 'Dalälven': 'Далэльвен', 'Oulu': 'Оулуйоки', 'Muonio': 'Муонионйоки', 'Patsoyoki': 'Паз', 'Lotta': 'Лотта',
 'Voronya': 'Воронья', 'Kelkit': 'Келькит', 'Ceyhan': 'Джейхан', 'Murat': 'Мурат', 'Qezel Owzan': 'Кызылузен', 'Sefid': 'Сефидруд', 'Haliacmon': 'Альякмон',
 'Strymnas': 'Струма', 'Drin': 'Дрин', 'Ialomita': 'Яломица', 'Mur': 'Мур', 'Mukhavyets': 'Мухавец', 'Oloy': 'Олой', 'Tyung': 'Тюнг', 'Bol’shoy Yugan': 'Большой Юган',
 'Song’acha': 'Сунгача', 'Kizilirmak': 'Кызылырмак', 'Kiz?lirmak': 'Кызылырмак',
 # the world in outline
 'Nile': 'Нил', 'Amazonas': 'Амазонка', 'Mississippi': 'Миссисипи', 'Missouri': 'Миссури', 'Yangtze': 'Янцзы', 'Chang Jiang': 'Янцзы', 'Jinsha': 'Цзиньшацзян',
 'Congo': 'Конго', 'Lualaba': 'Луалаба', 'Mackenzie': 'Маккензи', 'Mekong': 'Меконг', 'Lancang': 'Меконг', 'Brahmaputra': 'Брахмапутра', 'Yarlung': 'Брахмапутра',
 'Ayeyarwady': 'Иравади', 'Paraná': 'Парана', 'St. Lawrence': 'Святого Лаврентия', 'Ganges': 'Ганг', 'Indus': 'Инд', 'Niger': 'Нигер', 'Zambezi': 'Замбези',
 'Orinoco': 'Ориноко', 'Columbia': 'Колумбия', 'Yukon': 'Юкон', 'Murray': 'Муррей', 'Darling': 'Дарлинг', 'Rhine': 'Рейн', 'Rhein': 'Рейн', 'Rhin': 'Рейн',
 'Seine': 'Сена', 'Elbe': 'Эльба', 'Loire': 'Луара', 'Ebro': 'Эбро', 'Tajo': 'Тахо', 'Tejo': 'Тахо', 'Po': 'По', 'Rhône': 'Рона', 'Thames': 'Темза', 'Orange': 'Оранжевая',
 'Rio Grande': 'Рио-Гранде', 'Colorado': 'Колорадо', 'Ohio': 'Огайо', 'Arkansas': 'Арканзас', 'Madeira': 'Мадейра', 'Negro': 'Риу-Негру', 'Tocantins': 'Токантинс',
 'São  Francisco': 'Сан-Франсиску', 'Salween': 'Салуин', 'Nu': 'Салуин', 'Xi': 'Сицзян', 'Ubangi': 'Убанги', 'Kasai': 'Касаи', 'Limpopo': 'Лимпопо', 'Sénégal': 'Сенегал',
 'Benue': 'Бенуэ', 'Abay': 'Голубой Нил', 'El Bahr el Azraq': 'Голубой Нил', 'El Bahr el Abyad': 'Белый Нил', 'Shatt al Arab': 'Шатт-эль-Араб', 'Yamuna': 'Джамна',
 'Narmada': 'Нармада', 'Krishna': 'Кришна', 'Godävari': 'Годавари', 'Hudson': 'Гудзон', 'Potomac': 'Потомак', 'Fraser': 'Фрейзер', 'Nelson': 'Нельсон',
 'Saskatchewan': 'Саскачеван', 'Athabasca': 'Атабаска', 'Peace': 'Пис', 'Slave': 'Невольничья', 'Ucayali': 'Укаяли', 'Marañón': 'Мараньон', 'Purús': 'Пурус',
 'Xingu': 'Шингу', 'Tapajós': 'Тапажос', 'Uruguay': 'Уругвай', 'Araguaia': 'Арагуая', 'Niagara': 'Ниагара', 'Victoria Nile': 'Виктория-Нил', 'Albert Nile': 'Альберт-Нил',
 'Grande': 'Рио-Гранде', 'Snake': 'Снейк', 'Magdalena': 'Магдалена', 'Tennessee': 'Теннесси', 'Volta': 'Вольта', 'Jordan': 'Иордан', 'Helmand': 'Гильменд',
 'Okavango': 'Окаванго', 'Chenab': 'Чинаб', 'Sutlej': 'Сатледж', 'Garonne': 'Гаронна', 'Duero': 'Дуэро', 'Glomma': 'Гломма', 'Göta älv': 'Гёта-Эльв', 'Drava': 'Драва',
}

def dp(pts, tol):
    """Douglas–Peucker on [lon, lat] pairs"""
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True; st = [(0, len(pts) - 1)]
    while st:
        a, b = st.pop(); ax, ay = pts[a]; bx, by = pts[b]; dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy) or 1e-12; best, bi = -1, -1
        for i in range(a + 1, b):
            px, py = pts[i]; d = abs(dy * px - dx * py + bx * ay - by * ax) / L
            if d > best: best, bi = d, i
        if best > tol: keep[bi] = True; st.append((a, bi)); st.append((bi, b))
    return [p for p, k in zip(pts, keep) if k]
def enc(pts):
    out, px, py = [], None, None
    for lon, lat in pts:
        x, y = round(lon * 100), round(lat * 100)
        if px is None: out += [x, y]
        else:
            if x == px and y == py: continue
            out += [x - px, y - py]
        px, py = x, y
    return out
def lines(g):
    if not g: return []
    return g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']] if g['type'] == 'LineString' else []
def rings(g):
    if not g: return []
    return [g['coordinates'][0]] if g['type'] == 'Polygon' else [p[0] for p in g['coordinates']] if g['type'] == 'MultiPolygon' else []
def centroid(ring):
    a = cx = cy = 0.0
    for i in range(len(ring) - 1):
        x0, y0 = ring[i][:2]; x1, y1 = ring[i + 1][:2]; c = x0 * y1 - x1 * y0; a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c
    if abs(a) < 1e-12: return [sum(p[0] for p in ring) / len(ring), sum(p[1] for p in ring) / len(ring)]
    return [cx / (3 * a), cy / (3 * a)]
def area(ring): return abs(sum(ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1] for i in range(len(ring) - 1)) / 2)
EUR = lambda lon, lat: 15 <= lon <= 180 and 36 <= lat <= 78
def sr(p, d=99):
    """Natural Earth's scale rank (0 is the largest — not a missing value)"""
    v = p.get('scalerank', p.get('SCALERANK'))
    return int(v) if isinstance(v, (int, float)) else d
def mid(ls):
    pts = [p for l in ls for p in l]; return pts[len(pts) // 2] if pts else None

G = {'v': 1, 'src': 'Natural Earth (public domain), naturalearthdata.com; via github.com/nvkelso/natural-earth-vector', 'rivers': [], 'rlab': [], 'lakes': [], 'regions': [], 'seas': [], 'peaks': []}
# rivers: Eurasia at 1:10m, the rest of the world at 1:50m (scalerank ≤ 5)
by_name = {}
def add_river(n, r, ls, tol):
    for l in ls:
        s = dp([p[:2] for p in l], tol)
        if len(s) >= 2: G['rivers'].append({'r': r, 'c': enc(s)})
    if n:
        k = by_name.setdefault(n, {'n': n, 'r': r, 'len': 0, 'll': None})
        ln = sum(len(l) for l in ls)
        if ln > k['len']: k['len'] = ln; m = mid(ls); k['ll'] = [round(m[0], 2), round(m[1], 2)] if m else None
        k['r'] = min(k['r'], r)
for f in get('ne_10m_rivers_lake_centerlines'):
    p = f['properties']; ls = lines(f['geometry'])
    pts = [q for l in ls for q in l]
    if not pts: continue
    cx = sum(q[0] for q in pts) / len(pts); cy = sum(q[1] for q in pts) / len(pts)
    if not EUR(cx, cy) or sr(p) > 9: continue
    add_river(p.get('name') or p.get('name_en') or '', sr(p), ls, .012)
for f in get('ne_50m_rivers_lake_centerlines'):
    p = f['properties']; ls = lines(f['geometry'])
    pts = [q for l in ls for q in l]
    if not pts: continue
    cx = sum(q[0] for q in pts) / len(pts); cy = sum(q[1] for q in pts) / len(pts)
    if EUR(cx, cy) or sr(p) > 5: continue
    add_river(p.get('name') or '', sr(p), ls, .03)
SKIP = ('Protoka', 'Branch', 'Bratul', 'Delta', 'Canal', 'Csatorna', 'Duna')
for k in by_name.values():
    if not k['ll'] or any(s in k['n'] for s in SKIP): continue
    o = {'n': k['n'], 'r': k['r'], 'll': k['ll']}
    if k['n'] in RIVER_RU: o['ru'] = RIVER_RU[k['n']]
    G['rlab'].append(o)
# lakes and reservoirs: Eurasia at 1:10m (scalerank ≤ 7), the world's large lakes at 1:50m
def add_lake(p, rs, tol):
    big = max(rs, key=area)
    ring = [q[:2] for q in big]; h = len(ring) // 2
    s = dp(ring[:h + 1], tol)[:-1] + dp(ring[h:], tol)   # a closed ring is simplified in two halves (its ends coincide)
    if len(s) < 4: return
    o = {'r': sr(p, 9), 'c': enc(s)}
    n = p.get('name') or p.get('NAME')
    if n: o['n'] = n
    ru = p.get('name_ru') or p.get('NAME_RU')
    if ru: o['ru'] = ru
    y = p.get('year')
    if isinstance(y, (int, float)) and y > 1000: o['y'] = int(y)
    if p.get('dam_name'): o['dam'] = p['dam_name']
    c = centroid(big); o['ll'] = [round(c[0], 2), round(c[1], 2)]
    G['lakes'].append(o)
for f in get('ne_10m_lakes'):
    p = f['properties']; rs = rings(f['geometry'])
    if not rs: continue
    c = centroid(max(rs, key=area))
    if EUR(c[0], c[1]) and sr(p) <= 7: add_lake(p, rs, .01)
for f in get('ne_50m_lakes'):
    p = f['properties']; rs = rings(f['geometry'])
    if not rs: continue
    c = centroid(max(rs, key=area))
    if not EUR(c[0], c[1]) and sr(p) <= 1: add_lake(p, rs, .04)
# seas and oceans: a label point each
for f in get('ne_50m_geography_marine_polys'):
    p = f['properties']; rs = rings(f['geometry'])
    if not rs or sr(p, 9) > 4 or p.get('featurecla') == 'river': continue
    big = max(rs, key=area); c = centroid(big)
    G['seas'].append({'n': p['name'], 'ru': p.get('name_ru'), 'r': sr(p), 'll': [round(c[0], 2), round(c[1], 2)]})
# mountain ranges, plains, deserts, plateaux, peninsulas, lowlands: a label point each (islands and continents left out)
KIND = {'Range/mtn': 'mtn', 'Plateau': 'plat', 'Desert': 'des', 'Plain': 'plain', 'Lowland': 'plain', 'Basin': 'basin', 'Pen/cape': 'pen', 'Tundra': 'plain',
        'Delta': 'delta', 'Valley': 'valley', 'Gorge': 'valley', 'Geoarea': 'area', 'Isthmus': 'pen', 'Depression': 'basin', 'Foothills': 'mtn', 'Coast': 'area'}
for f in get('ne_50m_geography_regions_polys'):
    p = f['properties']; k = KIND.get(p.get('FEATURECLA'))
    if not k: continue
    rs = rings(f['geometry'])
    if not rs: continue
    big = max(rs, key=area); c = centroid(big)
    n = p['NAME']; n = n.title() if n.isupper() else n
    G['regions'].append({'n': n, 'ru': p.get('NAME_RU'), 'k': k, 'r': sr(p, 5), 'll': [round(c[0], 2), round(c[1], 2)]})
# peaks and volcanoes: Eurasia in detail, the world's highest
for f in get('ne_10m_geography_regions_elevation_points'):
    p = f['properties']
    lon, lat = f['geometry']['coordinates'][:2]
    r = sr(p, 9)
    if not (EUR(lon, lat) and r <= 6) and r > 3: continue
    o = {'n': p['name'], 'k': p.get('featurecla'), 'r': r, 'll': [round(lon, 3), round(lat, 3)]}
    if p.get('name_ru'): o['ru'] = p['name_ru']
    if isinstance(p.get('elevation'), (int, float)) and p['elevation'] > 0: o['e'] = int(p['elevation'])
    G['peaks'].append(o)
js = ('/* GENERATED by tools/gen_geo.py — do not edit by hand. GEO_NE: the physical map of the historical globe (v36), from Natural Earth\n'
      '   (public domain). Lines are integers in hundredths of a degree: the first point whole, the rest as steps; r is Natural Earth\'s scale rank\n'
      '   (0 the largest); a lake with y is a reservoir, drawn from the year its dam closed. */\n'
      'const GEO_NE=' + json.dumps(G, ensure_ascii=False, separators=(',', ':')) + ';\n')
(root / 'src' / 'data_geo.js').write_text(js, encoding='utf-8')
nr = sum(len(x['c']) // 2 for x in G['rivers'])
print(f"wrote src/data_geo.js: {len(G['rivers'])} river lines ({nr} points), {len(G['rlab'])} river names ({sum(1 for x in G['rlab'] if 'ru' in x)} in Russian), "
      f"{len(G['lakes'])} lakes ({sum(1 for x in G['lakes'] if 'y' in x)} reservoirs), {len(G['seas'])} seas, {len(G['regions'])} regions, {len(G['peaks'])} peaks; {len(js) // 1024} KB")
