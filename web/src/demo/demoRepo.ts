import catalog from '../../catalog/collections.json';
import type { Repo } from '../lib/repo';
import type { Card, CardSet, CardStatus, Collection, MarketPrice, SetProgress, UserCard, UserPrice } from '../lib/types';

/**
 * Modalità demo: catalogo da catalog/collections.json, carte da fixture.json
 * (generato dai CSV in Base/), stato utente salvato in localStorage.
 */

type Row = [string, string, number, string, string | null, string | null, number, string, string | null, string | null, string | null, string | null];
interface Fixture {
  pricesDate: string;
  cards: Row[];
  prices: Record<string, number>;
  owned: string[];
  pending: string[];
}
interface Store {
  cards: Record<string, [CardStatus, number]>;
  prices: Record<string, number>;
}

const KEY = 'tcg-demo-v1';
let fixture: Fixture | null = null;
let cardsBySet: Map<string, Card[]> | null = null;
let store: Store | null = null;

async function load() {
  if (fixture && cardsBySet) return;
  fixture = (await import('./fixture.json')).default as unknown as Fixture;
  cardsBySet = new Map();
  for (const r of fixture.cards) {
    const card: Card = {
      id: r[0], set_id: r[1], number: r[2], number_label: r[2] >= 900 ? String.fromCharCode(r[2] - 900 + 64) : null, name: r[3], subtitle: r[4], rarity: r[5],
      rarity_rank: r[6], version: r[7], variant: r[8], type: r[9], image_url: r[10], external_id: r[11],
    };
    const list = cardsBySet.get(card.set_id) ?? [];
    list.push(card);
    cardsBySet.set(card.set_id, list);
  }
}

function getStore(): Store {
  if (store) return store;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) store = JSON.parse(raw) as Store;
  } catch {
    store = null;
  }
  if (!store) {
    store = { cards: {}, prices: {} };
    fixture?.owned.forEach((id) => (store!.cards[id] = ['owned', 1]));
    fixture?.pending.forEach((id) => (store!.cards[id] = ['pending', 1]));
  }
  return store;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage pieno o non disponibile: lo stato resta in memoria */
  }
}

const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120));

export function resetDemo() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  store = null;
}

export const demoRepo: Repo = {
  mode: 'demo',

  async listCollections() {
    return delay(
      catalog.collections.map(({ sets: _sets, ...c }) => ({ cover_url: null, ...c }) as unknown as Collection),
    );
  },

  async listSets() {
    return delay(
      catalog.collections.flatMap((c) =>
        c.sets.map(
          (s) =>
            ({
              collection_id: c.id, release_date: null, logo_url: null, card_back_url: null, rarity_order: null,
              ...s, price_config: ('price_config' in s ? s.price_config : null) ?? {},
            }) as unknown as CardSet,
        ),
      ),
    );
  },

  async setProgress() {
    await load();
    const st = getStore();
    const out: SetProgress[] = [];
    for (const [setId, cards] of cardsBySet!) {
      const p: SetProgress = { set_id: setId, total: cards.length, owned: 0, pending: 0, owned_value: 0, missing_value: 0 };
      for (const c of cards) {
        const s = st.cards[c.id];
        const price = st.prices[c.id] ?? fixture!.prices[c.id] ?? 0;
        if (s?.[0] === 'owned') {
          p.owned++;
          p.owned_value += price * s[1];
        } else {
          if (s?.[0] === 'pending') p.pending++;
          p.missing_value += price;
        }
      }
      out.push(p);
    }
    return delay(out);
  },

  async setPreview(setId, limit = 3) {
    await load();
    const cards = [...(cardsBySet!.get(setId) ?? [])].filter((c) => c.image_url);
    cards.sort((a, b) => (b.rarity_rank ?? 0) - (a.rarity_rank ?? 0) || a.number - b.number);
    return Array.from(new Set(cards.map((c) => c.image_url!))).slice(0, limit);
  },

  async listCards(setId) {
    await load();
    return delay([...(cardsBySet!.get(setId) ?? [])]);
  },

  async listPrices(setId) {
    await load();
    const out: MarketPrice[] = [];
    for (const c of cardsBySet!.get(setId) ?? []) {
      const p = fixture!.prices[c.id];
      if (p != null)
        out.push({ card_id: c.id, price: p, price_low: null, price_avg30: null, currency: 'EUR', source: 'cardmarket', updated_at: fixture!.pricesDate });
    }
    return delay(out);
  },

  async listUserCards(setId) {
    await load();
    const st = getStore();
    const out: UserCard[] = [];
    for (const c of cardsBySet!.get(setId) ?? []) {
      const s = st.cards[c.id];
      if (s) out.push({ card_id: c.id, status: s[0], quantity: s[1], notes: null });
    }
    return delay(out);
  },

  async listUserPrices(setId) {
    await load();
    const st = getStore();
    const ids = new Set((cardsBySet!.get(setId) ?? []).map((c) => c.id));
    return delay(Object.entries(st.prices).filter(([id]) => ids.has(id)).map(([card_id, price]): UserPrice => ({ card_id, price })));
  },

  async setStatus(cardIds, status) {
    const st = getStore();
    for (const id of cardIds) {
      if (status === null) delete st.cards[id];
      else st.cards[id] = [status, st.cards[id]?.[1] ?? 1];
    }
    save();
    await delay(null);
  },

  async setQuantity(cardId, quantity) {
    const st = getStore();
    if (st.cards[cardId]) st.cards[cardId][1] = Math.max(1, Math.round(quantity));
    save();
    await delay(null);
  },

  async setUserPrice(cardId, price) {
    const st = getStore();
    if (price == null) delete st.prices[cardId];
    else st.prices[cardId] = price;
    save();
    await delay(null);
  },

  async refreshPrices() {
    await delay(null);
    return `Modalità demo: prezzi Cardmarket fissi al ${fixture?.pricesDate ?? '—'}`;
  },
};
