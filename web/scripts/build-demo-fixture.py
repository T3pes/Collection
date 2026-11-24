"""Genera src/demo/fixture.json (dati della modalità demo) dai CSV in Base/.

Uso:  python web/scripts/build-demo-fixture.py <cartella Base> [prezzi_me02.json]
Applica la stessa normalizzazione della migrazione SQL (version/subtitle, rarità, immagini TCGdex).
"""
import csv, json, sys, uuid, hashlib, re
from pathlib import Path

base = Path(sys.argv[1])
prices_file = Path(sys.argv[2]) if len(sys.argv) > 2 else None
out = Path(__file__).resolve().parent.parent / 'src' / 'demo' / 'fixture.json'
NS = uuid.UUID('6f1c8f9e-2b9a-4a51-9f39-7f0b6f3d6a10')


NARUTO_ORDER = ['C','UC','R','RA','S','SP','SV','POP','CHIBI','SHINOBI','M','MYTHOS','L','MISSION']
POKE_ORDER = ['Comune','Non comune','Rara','Rara doppia','Ultrarara','Rara illustrazione','Rara illustrazione speciale','Rara iper Mega','Mega Iper Raro']
FINISH = {'': 'Normale', 'normale': 'Normale', 'normal': 'Normale', 'full art': 'Full Art', 'fullart': 'Full Art', 'holo': 'Holo', 'reverse': 'Reverse'}

ME05 = {"Comune":[1,2,3,5,9,10,11,13,15,18,19,21,23,25,29,32,33,36,42,43,44,46,49,50,51,53,57,58,60,61,63,66,67,69,71,72,73],"Rara doppia":[4,8,16,27,31,38,45,48,55,65],"Non comune":[6,7,14,17,22,24,26,30,34,37,39,40,41,52,54,64,68,74,75,76,77,78,79,80,81,82],"Rara":[12,20,28,35,47,56,59,62,70,83,84],"Rara illustrazione":[85,86,87,88,89,90,91,92,93,94,95],"Ultrarara":[96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113],"Rara illustrazione speciale":[114,115,116,117,118,119],"Mega Iper Raro":[120]}
me05_rarity = {n: r for r, ns in ME05.items() for n in ns}
me02 = json.loads(prices_file.read_text()) if prices_file else {}

def rank(order, rarity):
    up = [o.upper() for o in order]
    return up.index(rarity.upper()) + 1 if rarity and rarity.upper() in up else 99

def read(name):
    with open(base / name, encoding='utf-8') as f:
        return list(csv.DictReader(f))

cards, prices = [], {}

def add(set_id, rows, order, tcg=None, rarity_map=None, id_field=None, price_map=None):
    for r in rows:
        num = int(re.sub(r'\D', '', r['id']) or 0)
        raw_v = (r.get('version') or '').strip()
        version = FINISH.get(raw_v.lower(), 'Normale')
        subtitle = None if raw_v.lower() in FINISH else raw_v
        rarity = (r.get('rarity') or '').strip() or None
        image = (r.get('image_url') or '').strip() or None
        ext = None
        if tcg:
            ext = f"{tcg}-{num:03d}"
            image = f"https://assets.tcgdex.net/it/me/{tcg}/{num:03d}/high.webp"
            if rarity_map and num in rarity_map:
                rarity = rarity_map[num]
        cid = (r.get(id_field) or '').strip() if id_field else ''
        if not cid:
            cid = str(uuid.uuid5(NS, f"{set_id}|{num}|{r['name']}|{subtitle}|{rarity}|{version}|{image}"))
        cards.append([cid, set_id, num, r['name'].strip(), subtitle, rarity, rank(order, rarity or ''), version,
                      (r.get('set_variant') or None), (r.get('type') or None), image, ext])
        if price_map and str(num) in price_map:
            normal, rev, _ = price_map[str(num)]
            p = (rev or normal) if version == 'Reverse' else normal
            if p: prices[cid] = p

rows = read('cards_rows_20260902.csv')
add('naruto-s1-1ed', [r for r in rows if '1 ed' in r['set']], NARUTO_ORDER, id_field='serial_id')
add('naruto-s1-2ed', [r for r in rows if '2 ed' in r['set']], NARUTO_ORDER, id_field='serial_id')
add('naruto-s2-1ed', read('cards_official_new_only.csv'), NARUTO_ORDER)
add('pokemon-me02', read('cards_pokemon_fiamme_spettrali.csv'), POKE_ORDER, tcg='me02',
    rarity_map={int(k): v[2] for k, v in me02.items()}, id_field='card_id', price_map=me02)
add('pokemon-me05', read('cards_pokemon_buio_pesto.csv'), POKE_ORDER, tcg='me05', rarity_map=me05_rarity, id_field='card_id')

# Stato demo deterministico: ~45% possedute, ~3% in arrivo
owned, pending = [], []
for c in cards:
    h = int(hashlib.md5(c[0].encode()).hexdigest()[:4], 16) / 0xffff
    if h < 0.45: owned.append(c[0])
    elif h < 0.48: pending.append(c[0])

fixture = {
    'generatedAt': '2026-11-24',
    'pricesDate': '2026-11-24',
    'cards': cards,
    'prices': prices,
    'owned': owned,
    'pending': pending,
}
out.write_text(json.dumps(fixture, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f"{len(cards)} carte, {len(prices)} prezzi, {len(owned)} possedute, {len(pending)} in arrivo -> {out} ({out.stat().st_size//1024} KB)")
