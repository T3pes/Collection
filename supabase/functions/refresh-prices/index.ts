// Supabase Edge Function: refresh-prices
// ---------------------------------------------------------------------
// Aggiorna i prezzi di mercato (Cardmarket, EUR) dei set con
// price_provider = 'tcgdex' leggendoli da https://api.tcgdex.net (gratuito,
// nessuna API key). Completa anche le immagini mancanti delle carte.
//
// Chiamata:  POST /functions/v1/refresh-prices   body: { "setId"?: string, "force"?: boolean }
//  - dall'app (pulsante "Aggiorna prezzi"), con il JWT dell'utente
//  - da pg_cron una volta al giorno (vedi supabase/cron_refresh_prices.sql)
//
// Per evitare abusi un set non viene ri-aggiornato prima di MIN_HOURS ore,
// a meno che la chiamata non usi la service role key con force = true.
// ---------------------------------------------------------------------
import { createClient } from 'npm:@supabase/supabase-js@2';

const MIN_HOURS = 6;
const CONCURRENCY = 6;
const TCGDEX = 'https://api.tcgdex.net/v2';
const PLACEHOLDER_RE = /(pokemon-01\.png|pokemon-logo\.png)$/i;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Json = Record<string, unknown>;
type CardRow = { id: string; number: number; version: string; rarity: string | null; image_url: string | null; external_id: string | null };
type CardPatch = { id: string; image_url?: string; external_id?: string; rarity?: string; rarity_rank?: number };
type Cardmarket = Record<string, number | string | undefined>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function getJson<T>(url: string): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.ok) return (await res.json()) as T;
    if (res.status === 404) throw new Error(`404 ${url}`);
    await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
  }
  throw new Error(`Impossibile leggere ${url}`);
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

const bearer = (req: Request) => (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();

function isServiceRole(token: string): boolean {
  if (!token) return false;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceKey && token === serviceKey) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload?.role === 'service_role';
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Usa POST' }, 405);

  const body: Json = await req.json().catch(() => ({}));
  const onlySet = typeof body.setId === 'string' ? body.setId : null;
  const token = bearer(req);
  const service = isServiceRole(token);
  const force = body.force === true && service;

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  // Autorizzazione: service role (cron) oppure utente loggato nell'app.
  // Fatta qui perché "Verify JWT" (segreto legacy) non accetta i token firmati con le nuove chiavi.
  if (!service) {
    const { data: who, error: authErr } = token ? await admin.auth.getUser(token) : { data: null, error: true };
    if (authErr || !who?.user) return json({ error: 'Accesso non autorizzato: effettua il login' }, 401);
  }

  let q = admin.from('tcg_sets').select('id, price_provider, price_config, rarity_order, tcg_collections(rarity_order)').eq('price_provider', 'tcgdex').eq('active', true);
  if (onlySet) q = q.eq('id', onlySet);
  const { data: sets, error: setsErr } = await q;
  if (setsErr) return json({ error: setsErr.message }, 500);

  const report: Json[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const set of sets ?? []) {
    const cfg = (set.price_config ?? {}) as { setId?: string; lang?: string; series?: string; syncRarity?: boolean };
    // deno-lint-ignore no-explicit-any
    const rarityOrder: string[] = ((set as any).rarity_order ?? (set as any).tcg_collections?.rarity_order ?? []).map((r: string) => r.toUpperCase());
    if (!cfg.setId) {
      report.push({ set: set.id, skipped: 'price_config.setId mancante' });
      continue;
    }
    const lang = cfg.lang ?? 'it';

    const { data: cards, error: cardsErr } = await admin
      .from('tcg_cards')
      .select('id, number, version, rarity, image_url, external_id')
      .eq('set_id', set.id)
      .returns<CardRow[]>();
    if (cardsErr) {
      report.push({ set: set.id, error: cardsErr.message });
      continue;
    }
    if (!cards?.length) {
      report.push({ set: set.id, skipped: 'nessuna carta' });
      continue;
    }

    if (!force) {
      const { data: last } = await admin
        .from('tcg_card_prices')
        .select('updated_at')
        .in('card_id', cards.slice(0, 50).map((c) => c.id))
        .order('updated_at', { ascending: false })
        .limit(1);
      const lastAt = last?.[0]?.updated_at ? new Date(last[0].updated_at).getTime() : 0;
      if (Date.now() - lastAt < MIN_HOURS * 3600_000) {
        report.push({ set: set.id, skipped: `aggiornato meno di ${MIN_HOURS} ore fa`, updatedAt: last?.[0]?.updated_at });
        continue;
      }
    }

    let setData: { cards: { id: string; localId: string; image?: string }[] };
    try {
      setData = await getJson(`${TCGDEX}/${lang}/sets/${cfg.setId}`);
    } catch (e) {
      report.push({ set: set.id, error: String(e) });
      continue;
    }

    const neededNumbers = new Set(cards.map((c) => c.number));
    const briefs = setData.cards.filter((c) => neededNumbers.has(parseInt(c.localId, 10)));
    const details = await mapLimit(briefs, CONCURRENCY, async (b) => {
      try {
        return await getJson<{
          localId: string;
          image?: string;
          rarity?: string;
          variants?: { normal?: boolean; reverse?: boolean; holo?: boolean };
          pricing?: { cardmarket?: Cardmarket };
        }>(`${TCGDEX}/${lang}/cards/${encodeURIComponent(b.id)}`);
      } catch {
        return null;
      }
    });
    const byNumber = new Map<number, (typeof details)[number] & { id?: string }>();
    details.forEach((d, i) => d && byNumber.set(parseInt(d.localId, 10), { ...d, id: briefs[i].id }));

    const priceRows: Json[] = [];
    const historyRows: Json[] = [];
    const cardUpdates: CardPatch[] = [];
    const now = new Date().toISOString();

    for (const card of cards) {
      const d = byNumber.get(card.number);
      if (!d) continue;

      const patch: CardPatch = { id: card.id };
      if (d.image && (!card.image_url || PLACEHOLDER_RE.test(card.image_url))) patch.image_url = `${d.image}/high.webp`;
      if (!card.external_id && d.id) patch.external_id = d.id;
      // Rarità ufficiale (es. "Rara doppia") al posto di quella semplificata del CSV
      if (cfg.syncRarity && d.rarity && d.rarity !== card.rarity) {
        patch.rarity = d.rarity;
        const rank = rarityOrder.indexOf(d.rarity.toUpperCase());
        patch.rarity_rank = rank >= 0 ? rank + 1 : 99;
      }
      if (Object.keys(patch).length > 1) cardUpdates.push(patch);

      const cm = d.pricing?.cardmarket;
      if (!cm) continue;
      // Per le varianti Reverse Cardmarket espone i campi con suffisso "-holo"
      const reverse = /reverse/i.test(card.version);
      const pick = (k: string) => (reverse ? num(cm[`${k}-holo`]) ?? num(cm[k]) : num(cm[k]));
      const price = pick('trend') ?? pick('avg30') ?? pick('avg') ?? pick('low');
      if (price == null) continue;

      priceRows.push({
        card_id: card.id,
        source: 'cardmarket',
        currency: typeof cm.unit === 'string' ? cm.unit : 'EUR',
        price,
        price_low: pick('low'),
        price_avg30: pick('avg30'),
        url: null,
        raw: cm,
        updated_at: now,
      });
      historyRows.push({ card_id: card.id, day: today, source: 'cardmarket', price });
    }

    const chunks = <T,>(arr: T[], size = 400) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));
    const errors: string[] = [];
    for (const part of chunks(priceRows)) {
      const { error } = await admin.from('tcg_card_prices').upsert(part, { onConflict: 'card_id' });
      if (error) errors.push(error.message);
    }
    for (const part of chunks(historyRows)) {
      const { error } = await admin.from('tcg_card_price_history').upsert(part, { onConflict: 'card_id,day,source' });
      if (error) errors.push(error.message);
    }
    await mapLimit(cardUpdates, 8, async ({ id, ...patch }) => {
      const { error } = await admin.from('tcg_cards').update(patch).eq('id', id);
      if (error) errors.push(error.message);
    });

    report.push({
      set: set.id,
      cards: cards.length,
      priced: priceRows.length,
      imagesFixed: cardUpdates.filter((u) => u.image_url).length,
      raritiesFixed: cardUpdates.filter((u) => u.rarity).length,
      errors: errors.slice(0, 5),
    });
  }

  return json({ ok: true, report });
});
