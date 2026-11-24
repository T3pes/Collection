#!/usr/bin/env node
/**
 * Pubblica il catalogo su Supabase.
 *
 *   npm run catalog:sync                     # collezioni + set + carte da catalog/cards/*.csv
 *   npm run catalog:sync -- --set pokemon-me06 --tcgdex   # importa le carte del set da TCGdex
 *   npm run catalog:sync -- --dry-run        # mostra cosa farebbe, senza scrivere
 *   (--tcgdex non tocca i set che hanno già carte, salvo --force)
 *
 * Richiede in web/.env: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
 * (la service role key serve solo qui, in locale: non va mai nel frontend).
 */
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const DRY = flag('dry-run');
const ONLY = opt('set');
const TCGDEX = flag('tcgdex');

// ---------- .env minimale ----------
for (const file of ['.env.local', '.env']) {
  const p = join(root, file);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!DRY && (!url || !key)) {
  console.error('✖ Servono VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in web/.env');
  process.exit(1);
}
const db = DRY ? null : createClient(url, key, { auth: { persistSession: false } });

// ---------- utilità ----------
const NS = '6f1c8f9e-2b9a-4a51-9f39-7f0b6f3d6a10';
function uuidv5(name, ns = NS) {
  const nsBytes = Buffer.from(ns.replace(/-/g, ''), 'hex');
  const h = createHash('sha1').update(Buffer.concat([nsBytes, Buffer.from(name, 'utf8')])).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

function parseCsv(text) {
  const sep = (text.split(/\r?\n/)[0].match(/;/g) ?? []).length > (text.split(/\r?\n/)[0].match(/,/g) ?? []).length ? ';' : ',';
  const rows = [];
  let row = [];
  let f = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') (f += '"'), i++;
        else q = false;
      } else f += c;
    } else if (c === '"') q = true;
    else if (c === sep) row.push(f), (f = '');
    else if (c === '\n') row.push(f), rows.push(row), (row = []), (f = '');
    else if (c !== '\r') f += c;
  }
  if (f || row.length) row.push(f), rows.push(row);
  const head = rows.shift().map((h) => h.trim().replace(/^﻿/, ''));
  return rows.filter((r) => r.some((v) => v.trim())).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}

const FINISH = { '': 'Normale', normale: 'Normale', normal: 'Normale', 'full art': 'Full Art', fullart: 'Full Art', holo: 'Holo', reverse: 'Reverse' };
const rankOf = (order, rarity) => {
  const i = order.map((o) => o.toUpperCase()).indexOf((rarity ?? '').toUpperCase());
  return i >= 0 ? i + 1 : 99;
};

async function upsert(table, rows, onConflict) {
  if (!rows.length) return;
  if (DRY) return console.log(`  [dry-run] ${table}: ${rows.length} righe`);
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + 500), { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function getJson(u) {
  const r = await fetch(u, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`${r.status} ${u}`);
  return r.json();
}

/** Carte di un set TCGdex: una riga per variante (Normale / Reverse / Holo) */
async function cardsFromTcgdex(set, order) {
  const { setId, lang = 'it', series = setId.replace(/\d.*$/, '') } = set.price_config ?? {};
  if (!setId) throw new Error(`${set.id}: price_config.setId mancante`);
  const data = await getJson(`https://api.tcgdex.net/v2/${lang}/sets/${setId}`);
  const out = [];
  let i = 0;
  const workers = Array.from({ length: 6 }, async () => {
    while (i < data.cards.length) {
      const brief = data.cards[i++];
      const d = await getJson(`https://api.tcgdex.net/v2/${lang}/cards/${encodeURIComponent(brief.id)}`);
      const number = parseInt(d.localId, 10);
      const versions = [];
      if (d.variants?.normal) versions.push('Normale');
      if (d.variants?.reverse) versions.push('Reverse');
      if (!versions.length) versions.push(d.variants?.holo ? 'Holo' : 'Normale');
      for (const version of versions) {
        out.push({
          id: uuidv5(`${set.id}|${number}|${d.name}|${version}`),
          set_id: set.id,
          number,
          name: d.name,
          rarity: d.rarity ?? null,
          rarity_rank: rankOf(order, d.rarity),
          version,
          type: d.category ?? null,
          image_url: d.image ? `${d.image}/high.webp` : `https://assets.tcgdex.net/${lang}/${series}/${setId}/${d.localId}/high.webp`,
          external_id: d.id,
        });
      }
    }
  });
  await Promise.all(workers);
  return out.sort((a, b) => a.number - b.number);
}

function cardsFromCsv(set, order, file) {
  return parseCsv(readFileSync(file, 'utf8')).map((r) => {
    const number = parseInt(String(r.number ?? r.id ?? '').replace(/\D/g, ''), 10);
    const rawV = (r.version ?? '').trim();
    const version = FINISH[rawV.toLowerCase()] ?? rawV ?? 'Normale';
    const subtitle = r.subtitle || null;
    const rarity = r.rarity || null;
    const variant = r.variant || r.set_variant || null;
    const id = /^[0-9a-f-]{36}$/i.test(r.card_id ?? '') ? r.card_id : uuidv5(`${set.id}|${number}|${r.name}|${subtitle ?? ''}|${rarity ?? ''}|${version}|${variant ?? ''}`);
    return {
      id,
      set_id: set.id,
      number,
      number_label: r.number_label || null,
      name: r.name,
      subtitle,
      rarity,
      rarity_rank: rankOf(order, rarity),
      version: version || 'Normale',
      variant,
      type: r.type || null,
      image_url: r.image_url || null,
      external_id: r.external_id || null,
    };
  }).filter((c) => Number.isFinite(c.number) && c.name);
}

// ---------- main ----------
const catalog = JSON.parse(readFileSync(join(root, 'catalog', 'collections.json'), 'utf8'));
console.log(`${DRY ? '[dry-run] ' : ''}Sincronizzo ${catalog.collections.length} collezioni…`);

for (const c of catalog.collections) {
  const { sets = [], ...collection } = c;
  await upsert('tcg_collections', [collection], 'id');
  console.log(`✔ Collezione ${c.id}`);

  for (const s of sets) {
    if (ONLY && s.id !== ONLY) continue;
    const set = { collection_id: c.id, price_config: {}, ...s };
    await upsert('tcg_sets', [set], 'id');
    const order = set.rarity_order ?? c.rarity_order ?? [];
    const csv = join(root, 'catalog', 'cards', `${set.id}.csv`);

    let cards = [];
    if (existsSync(csv)) cards = cardsFromCsv(set, order, csv);
    else if (TCGDEX && set.price_provider === 'tcgdex') {
      // Non reimportare un set che ha già carte (es. quelle migrate dalla vecchia app): creerebbe doppioni
      const { count } = DRY ? { count: 0 } : await db.from('tcg_cards').select('id', { count: 'exact', head: true }).eq('set_id', set.id);
      if (count && !flag('force')) console.log(`  • Set ${set.id}: ha già ${count} carte, import TCGdex saltato (usa --force solo se sai cosa fai)`);
      else cards = await cardsFromTcgdex(set, order);
    }

    if (cards.length) {
      await upsert('tcg_cards', cards, 'id');
      console.log(`  ✔ Set ${set.id}: ${cards.length} carte ${existsSync(csv) ? `da ${set.id}.csv` : 'da TCGdex'}`);
    } else {
      console.log(`  • Set ${set.id}: catalogo aggiornato (nessun CSV in catalog/cards/${set.id}.csv${set.price_provider === 'tcgdex' ? ', usa --tcgdex per importarle' : ''})`);
    }
  }
}
console.log('Fatto.');
