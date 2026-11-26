import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Repo } from './repo';
import type { Card, CardSet, Collection, MarketPrice, SetProgress, UserCard, UserPrice } from './types';

const PAGE = 1000;

function check<T>(res: { data: T | null; error: PostgrestError | null }, what: string): T {
  if (res.error) {
    console.error(what, res.error);
    throw new Error(`${what}: ${res.error.message}`);
  }
  return res.data as T;
}

/** Legge tutte le righe superando il limite di 1000 di PostgREST */
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>, what: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const rows = check(await build(from, from + PAGE - 1), what);
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

async function userId(): Promise<string> {
  const { data } = await supabase().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Sessione scaduta: effettua di nuovo il login');
  return id;
}

const n = (v: unknown) => (v == null ? null : Number(v));

export const supabaseRepo: Repo = {
  mode: 'supabase',

  async listCollections() {
    const rows = check(await supabase().from('tcg_collections').select('*').eq('active', true).order('sort'), 'Collezioni');
    return rows as Collection[];
  },

  async listSets() {
    const rows = check(await supabase().from('tcg_sets').select('*').eq('active', true).order('sort'), 'Set');
    return rows as CardSet[];
  },

  async setProgress() {
    const rows = check(await supabase().rpc('tcg_set_progress'), 'Statistiche');
    return (rows as SetProgress[]).map((r) => ({ ...r, owned_value: Number(r.owned_value), missing_value: Number(r.missing_value) }));
  },

  async setPreview(setId, limit = 3) {
    const rows = check(
      await supabase()
        .from('tcg_cards')
        .select('image_url, rarity_rank')
        .eq('set_id', setId)
        .not('image_url', 'is', null)
        .order('rarity_rank', { ascending: false })
        .order('number', { ascending: true })
        .limit(limit * 4),
      'Anteprima set',
    ) as { image_url: string }[];
    return Array.from(new Set(rows.map((r) => r.image_url))).slice(0, limit);
  },

  async listCards(setId) {
    return fetchAll<Card>(
      (from, to) =>
        supabase()
          .from('tcg_cards')
          .select('id,set_id,number,number_label,name,subtitle,rarity,rarity_rank,version,variant,type,image_url,external_id')
          .eq('set_id', setId)
          .order('number')
          .order('id')
          .range(from, to),
      'Carte',
    );
  },

  async listPrices(setId) {
    const rows = await fetchAll<MarketPrice & { tcg_cards?: unknown }>(
      (from, to) =>
        supabase()
          .from('tcg_card_prices')
          .select('card_id,price,price_low,price_avg30,currency,source,url,updated_at,tcg_cards!inner(set_id)')
          .eq('tcg_cards.set_id', setId)
          .range(from, to),
      'Prezzi',
    );
    return rows.map(({ tcg_cards: _, ...p }) => ({ ...p, price: n(p.price), price_low: n(p.price_low), price_avg30: n(p.price_avg30) }));
  },

  async listUserCards(setId) {
    const rows = await fetchAll<UserCard & { tcg_cards?: unknown }>(
      (from, to) =>
        supabase()
          .from('tcg_user_cards')
          .select('card_id,status,quantity,notes,tcg_cards!inner(set_id)')
          .eq('tcg_cards.set_id', setId)
          .range(from, to),
      'Collezione',
    );
    return rows.map(({ tcg_cards: _, ...r }) => r);
  },

  async listUserPrices(setId) {
    const rows = await fetchAll<UserPrice & { tcg_cards?: unknown }>(
      (from, to) =>
        supabase()
          .from('tcg_user_prices')
          .select('card_id,price,tcg_cards!inner(set_id)')
          .eq('tcg_cards.set_id', setId)
          .range(from, to),
      'Prezzi personali',
    );
    return rows.map(({ tcg_cards: _, ...r }) => ({ ...r, price: Number(r.price) }));
  },

  async setStatus(cardIds, status) {
    if (!cardIds.length) return;
    const uid = await userId();
    if (status === null) {
      check(await supabase().from('tcg_user_cards').delete().eq('user_id', uid).in('card_id', cardIds), 'Rimozione');
      return;
    }
    const rows = cardIds.map((card_id) => ({ user_id: uid, card_id, status }));
    check(await supabase().from('tcg_user_cards').upsert(rows, { onConflict: 'user_id,card_id' }), 'Salvataggio');
  },

  async setQuantity(cardId, quantity) {
    const uid = await userId();
    check(
      await supabase().from('tcg_user_cards').update({ quantity: Math.max(1, Math.round(quantity)) }).eq('user_id', uid).eq('card_id', cardId),
      'Quantità',
    );
  },

  async setUserPrice(cardId, price) {
    const uid = await userId();
    if (price == null) {
      check(await supabase().from('tcg_user_prices').delete().eq('user_id', uid).eq('card_id', cardId), 'Prezzo');
    } else {
      check(await supabase().from('tcg_user_prices').upsert({ user_id: uid, card_id: cardId, price }, { onConflict: 'user_id,card_id' }), 'Prezzo');
    }
  },

  async refreshPrices(setId) {
    const { data, error } = await supabase().functions.invoke('refresh-prices', { body: { setId } });
    if (error) throw new Error(`Aggiornamento prezzi non riuscito: ${error.message}`);
    const r = (data?.report ?? [])[0] as { priced?: number; skipped?: string; error?: string } | undefined;
    if (!r) return 'Nessun set da aggiornare';
    if (r.error) throw new Error(r.error);
    if (r.skipped) return `Prezzi già aggiornati di recente (${r.skipped})`;
    return `Prezzi aggiornati: ${r.priced ?? 0} carte`;
  },
};
