import type { Card, CardGroup, CardSet, CardView, Collection, MarketPrice, UserCard, UserPrice } from './types';

const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eurShort = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export const formatEur = (v: number | null | undefined, short = false) =>
  v == null || Number.isNaN(v) ? '—' : short && Math.abs(v) >= 100 ? eurShort.format(v) : eur.format(v);

export const pct = (owned: number, total: number) => (total > 0 ? Math.round((owned / total) * 1000) / 10 : 0);

export const pad = (n: number) => String(n).padStart(3, '0');

export const cardNumber = (c: Pick<Card, 'number' | 'number_label'>) => c.number_label ?? `#${pad(c.number)}`;

export function rarityLabel(collection: Collection | undefined, rarity: string | null | undefined): string {
  if (!rarity) return '—';
  const labels = collection?.rarity_labels ?? {};
  return labels[rarity] ?? labels[rarity.toUpperCase()] ?? rarity;
}

export function rarityOrderFor(collection: Collection | undefined, set: CardSet | undefined): string[] {
  return (set?.rarity_order?.length ? set.rarity_order : collection?.rarity_order) ?? [];
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Ricerca per numero (es. "12", "#012") o per nome/sottotitolo, senza accenti */
export function matchesQuery(c: Pick<Card, 'number' | 'name' | 'subtitle' | 'type'>, q: string): boolean {
  const query = norm(q).replace(/^#/, '');
  if (!query) return true;
  if (/^\d+$/.test(query)) return c.number === Number(query) || pad(c.number).startsWith(query);
  const hay = norm(`${c.name} ${c.subtitle ?? ''} ${c.type ?? ''}`);
  return query.split(/\s+/).every((t) => hay.includes(t));
}

export function buildViews(cards: Card[], userCards: UserCard[], prices: MarketPrice[], userPrices: UserPrice[]): CardView[] {
  const uc = new Map(userCards.map((u) => [u.card_id, u]));
  const mp = new Map(prices.map((p) => [p.card_id, p]));
  const up = new Map(userPrices.map((p) => [p.card_id, p.price]));
  return cards.map((c) => {
    const u = uc.get(c.id);
    const market = mp.get(c.id) ?? null;
    const userPrice = up.get(c.id) ?? null;
    return {
      ...c,
      status: u?.status ?? null,
      quantity: u?.quantity ?? 0,
      market,
      userPrice,
      price: userPrice ?? market?.price ?? null,
    };
  });
}

export function versionIndex(collection: Collection | undefined, version: string): number {
  const order = (collection?.version_order ?? []).map((v) => v.toLowerCase());
  const i = order.indexOf(version.toLowerCase());
  return i < 0 ? 50 : i;
}

/**
 * Raggruppa le versioni della stessa carta (stesso numero, nome, sottotitolo,
 * rarità e variante). Se un gruppo contiene due volte la stessa versione
 * (es. promo con illustrazioni diverse) le carte restano separate.
 */
export function groupCards(views: CardView[], collection: Collection | undefined): CardGroup[] {
  const map = new Map<string, CardView[]>();
  for (const v of views) {
    const key = [v.number, v.name, v.subtitle ?? '', v.rarity ?? '', v.variant ?? ''].join('|');
    const list = map.get(key);
    if (list) list.push(v);
    else map.set(key, [v]);
  }
  const groups: CardGroup[] = [];
  for (const [key, list] of map) {
    const versions = new Set(list.map((v) => v.version.toLowerCase()));
    const parts = versions.size === list.length ? [list] : list.map((v) => [v]);
    parts.forEach((variants, i) => {
      variants.sort((a, b) => versionIndex(collection, a.version) - versionIndex(collection, b.version));
      const first = variants[0];
      groups.push({
        key: parts.length > 1 ? `${key}|${i}` : key,
        number: first.number,
        name: first.name,
        subtitle: first.subtitle,
        rarity: first.rarity,
        rarity_rank: first.rarity_rank ?? 99,
        image_url: variants.find((v) => v.image_url)?.image_url ?? null,
        variants,
      });
    });
  }
  return groups;
}

export type SortKey = 'number' | 'name' | 'rarity' | 'rare' | 'price';

export function sortGroups(groups: CardGroup[], key: SortKey): CardGroup[] {
  const maxPrice = (g: CardGroup) => Math.max(-1, ...g.variants.map((v) => v.price ?? -1));
  const byNumber = (a: CardGroup, b: CardGroup) => a.number - b.number || a.name.localeCompare(b.name, 'it');
  const out = [...groups];
  if (key === 'number') out.sort((a, b) => byNumber(a, b) || a.rarity_rank - b.rarity_rank);
  if (key === 'name') out.sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base', numeric: true }) || a.number - b.number);
  if (key === 'rarity') out.sort((a, b) => a.rarity_rank - b.rarity_rank || byNumber(a, b));
  if (key === 'rare') out.sort((a, b) => (b.rarity_rank % 99) - (a.rarity_rank % 99) || byNumber(a, b));
  if (key === 'price') out.sort((a, b) => maxPrice(b) - maxPrice(a) || byNumber(a, b));
  return out;
}

export function marketSearchUrl(collection: Collection | undefined, c: Pick<Card, 'name' | 'number' | 'subtitle'>, setName?: string): string | null {
  const tpl = collection?.market_search_url;
  if (!tpl) return null;
  const q = [c.name, setName, pad(c.number)].filter(Boolean).join(' ');
  return tpl.replace('{q}', encodeURIComponent(q).replace(/%20/g, '+'));
}

export function isFoil(collection: Collection | undefined, c: Pick<Card, 'rarity_rank' | 'version'>): boolean {
  const from = collection?.theme?.foilFrom ?? 3;
  return (c.rarity_rank ?? 0) >= from && (c.rarity_rank ?? 0) < 99 ? true : /holo|reverse|full art/i.test(c.version);
}
