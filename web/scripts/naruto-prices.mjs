#!/usr/bin/env node
/**
 * Prezzi medi di vendita delle carte Naruto Mythos da narutocardcollector.com
 * (vendite concluse su eBay, controllate a mano dal sito).
 *
 * Uso solo con il consenso del gestore del sito: richieste lente (1 al secondo),
 * una sola per carta, con cache su disco per poter riprendere.
 *
 *   node scripts/naruto-prices.mjs            # scarica e genera il file SQL
 *   node scripts/naruto-prices.mjs --dry      # solo l'elenco carte, niente prezzi
 *
 * Output: scripts/.cache/naruto-prices.json e scripts/out/naruto-prices.sql
 * (da eseguire nel SQL Editor di Supabase: aggiorna solo le carte abbinate in modo univoco).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://narutocardcollector.com';
const DELAY_MS = 1000;
const RECENT_DAYS = 90;
const MIN_RECENT_SALES = 3;
const SETS = { 'KS-1': 'naruto-s1-1ed', 'KS-2': 'naruto-s1-2ed', 'SS-1': 'naruto-s2-1ed' };
// Rarità del sito -> codici usati nel nostro catalogo
const RARITY = {
  Mission: ['Mission'], Common: ['C'], Uncommon: ['UC'], Chibi: ['CHIBI'], Rare: ['R'], 'Rare Art': ['RA'],
  Secret: ['S'], Special: ['SP'], Shinobi: ['Shinobi'], Mythos: ['M', 'Mythos'], Legendary: ['L'], POP: ['POP'], 'Secret V': ['SV'],
};

const here = dirname(fileURLToPath(import.meta.url));
const cacheFile = join(here, '.cache', 'naruto-prices.json');
const sqlFile = join(here, 'out', 'naruto-prices.sql');
const dry = process.argv.includes('--dry');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const headers = { Accept: 'application/json', 'User-Agent': 'collection-tcg personal price import (contact via narutocardcollector Discord)' };

async function api(path, body) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(BASE + path, body
      ? { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : { headers });
    if (res.ok) return res.json();
    if (attempt >= 3 || (res.status < 500 && res.status !== 429)) throw new Error(`${res.status} ${path}`);
    await sleep(5000 * attempt);
  }
}

/** "001C-FA" -> { number: 1, version: 'Full Art' }; "000-1L" -> { number: 0, version: 'Normale' } */
function parseNumber(cardNumber) {
  const m = /^(\d+)/.exec(cardNumber);
  const version = /-FA$/i.test(cardNumber) ? 'Full Art' : /-H$/i.test(cardNumber) ? 'Holo' : 'Normale';
  return { number: m ? parseInt(m[1], 10) : null, version };
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null;
};

/** Mediana degli ultimi 90 giorni se ci sono abbastanza vendite, altrimenti mediana di sempre */
function pickPrice(h) {
  const since = Date.now() - RECENT_DAYS * 86400_000;
  const recent = (h.recentSales ?? []).filter((s) => !s.isGraded && Date.parse(s.soldAt) >= since).map((s) => s.price);
  if (recent.length >= MIN_RECENT_SALES) return { price: median(recent), basis: `mediana ${RECENT_DAYS}gg (${recent.length})` };
  if (h.medianPrice != null && h.totalSales > 0) return { price: h.medianPrice, basis: `mediana totale (${h.totalSales})` };
  return { price: null, basis: 'nessuna vendita' };
}

const cache = JSON.parse(await readFile(cacheFile, 'utf8').catch(() => '{}'));
const save = async () => { await mkdir(dirname(cacheFile), { recursive: true }); await writeFile(cacheFile, JSON.stringify(cache)); };

// 1) Elenco carte dei tre set (poche richieste)
const cards = [];
for (const setCode of Object.keys(SETS)) {
  for (let page = 1; ; page++) {
    const d = await api('/card/list', { setCode, page, pageSize: 200 });
    cards.push(...d.items);
    await sleep(DELAY_MS);
    if (page >= d.totalPages) break;
  }
}
console.log(`Carte sul sito: ${cards.length}`);
if (dry) process.exit(0);

// 2) Prezzi: una richiesta per carta, 1 al secondo, con cache
let done = 0;
for (const c of cards) {
  done++;
  if (cache[c.id]?.fetchedAt && Date.now() - Date.parse(cache[c.id].fetchedAt) < 20 * 3600_000) continue;
  try {
    const h = await api(`/card/${c.id}/price-history?displayCurrency=EUR`);
    cache[c.id] = { ...pickPrice(h), median: h.medianPrice, avg: h.averagePrice, low: h.lowestPrice, last: h.lastSoldPrice, sales: h.totalSales, fetchedAt: new Date().toISOString() };
  } catch (e) {
    console.warn(`  ! ${c.setCode} ${c.cardNumber}: ${e.message}`);
  }
  if (done % 25 === 0) { await save(); console.log(`  ${done}/${cards.length}`); }
  await sleep(DELAY_MS);
}
await save();

// 3) SQL compatto: abbina per set + numero + rarità + versione (le Legendary anche per nome)
const q = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const n = (x) => (x == null || !Number.isFinite(x) ? 'null' : Math.round(x * 100) / 100);
const rows = cards
  .map((c) => ({ c, p: cache[c.id], ...parseNumber(c.cardNumber) }))
  .filter((r) => r.p?.price != null && r.number != null && RARITY[r.c.rarity])
  .map(({ c, p, number, version }) =>
    `(${q(SETS[c.setCode].replace('naruto-', ''))},${number},${q(c.cardNumber)},'{${RARITY[c.rarity].join(',')}}','${version[0]}',${number === 0 ? q(c.name) : 'null'},${n(p.price)},${n(p.low)},${n(p.avg)},${p.sales ?? 0},'${p.basis.startsWith('mediana 90') ? 'r' : 't'}',${c.id})`);

const sql = `-- Prezzi Naruto Mythos da narutocardcollector.com (vendite eBay concluse, inserite a mano dal gestore), generato ${new Date().toISOString()}
drop table if exists ncc;
create temp table ncc (s text, number int, card_number text, rarities text[], v text, name text, price numeric, price_low numeric, price_avg numeric, sales int, b text, ncc_id int);
insert into ncc values
${rows.join(',')};
with m as (
  select c.id as card_id, n.*, count(*) over (partition by c.id) as hits, count(*) over (partition by n.card_number, n.s) as cards_per_src
  from ncc n join public.tcg_cards c
    on c.set_id = 'naruto-' || n.s and c.rarity = any(n.rarities)
   and (c.version = case n.v when 'F' then 'Full Art' when 'H' then 'Holo' else 'Normale' end
        -- Shinobi Shiren: lo "standard" del sito corrisponde al nostro Full Art (C/UC non hanno versione Normale)
        or (n.s = 's2-1ed' and n.v = 'N' and c.rarity in ('C', 'UC') and c.version = 'Full Art'))
   and (c.number = n.number or (n.number = 0 and lower(c.name) = lower(n.name)))
), ok as (select * from m where hits = 1 and cards_per_src = 1)
, up as (
  insert into public.tcg_card_prices (card_id, source, currency, price, price_low, price_avg30, url, raw, updated_at)
  select card_id, 'narutocardcollector', 'EUR', price, price_low, price_avg, '${BASE}/card/' || ncc_id,
         jsonb_build_object('card_number', card_number, 'sales', sales, 'basis', case b when 'r' then 'mediana ${RECENT_DAYS} giorni' else 'mediana di sempre' end), now() from ok
  on conflict (card_id) do update set source = excluded.source, currency = excluded.currency, price = excluded.price,
    price_low = excluded.price_low, price_avg30 = excluded.price_avg30, url = excluded.url, raw = excluded.raw, updated_at = excluded.updated_at
  returning card_id
), hist as (
  insert into public.tcg_card_price_history (card_id, day, source, price)
  select card_id, current_date, 'narutocardcollector', price from ok
  on conflict (card_id, day, source) do update set price = excluded.price
  returning card_id
)
select 'aggiornate' esito, (select count(*) from up) n, null dettaglio
union all select 'ambigue', count(*), string_agg(distinct s || ' ' || card_number, ', ') from m where not (hits = 1 and cards_per_src = 1)
union all select 'senza carta', count(*), string_agg(s || ' ' || card_number, ', ' order by s, card_number) from ncc n
  where not exists (select 1 from m where m.card_number = n.card_number and m.s = n.s);
drop table ncc;
`;
await mkdir(dirname(sqlFile), { recursive: true });
await writeFile(sqlFile, sql);
console.log(`Prezzi trovati: ${rows.length}/${cards.length}. SQL: ${sqlFile}`);
