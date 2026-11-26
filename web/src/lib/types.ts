export type CardStatus = 'owned' | 'pending';

export interface CollectionTheme {
  accent?: string;
  accent2?: string;
  ink?: string;
  bg?: string;
  bg2?: string;
  glow?: string;
  pattern?: 'swirl' | 'rings' | 'stars' | 'none';
  /** rarity_rank da cui la carta riceve l'effetto foil */
  foilFrom?: number;
  /** ordinamento predefinito della galleria */
  sort?: 'number' | 'name' | 'rarity' | 'rare' | 'price';
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  card_back_url: string | null;
  theme: CollectionTheme;
  rarity_order: string[];
  rarity_labels: Record<string, string>;
  version_order: string[];
  market_search_url: string | null;
  sort: number;
}

export interface CardSet {
  id: string;
  collection_id: string;
  name: string;
  subtitle: string | null;
  code: string | null;
  release_date: string | null;
  logo_url: string | null;
  card_back_url: string | null;
  rarity_order: string[] | null;
  price_provider: 'manual' | 'tcgdex';
  price_config: Record<string, unknown>;
  /** colori del set: sovrascrivono quelli della collezione (facoltativo) */
  theme?: CollectionTheme | null;
  sort: number;
}

export interface Card {
  id: string;
  set_id: string;
  number: number;
  number_label: string | null;
  name: string;
  subtitle: string | null;
  rarity: string | null;
  rarity_rank: number | null;
  version: string;
  variant: string | null;
  type: string | null;
  image_url: string | null;
  external_id: string | null;
}

export interface MarketPrice {
  card_id: string;
  price: number | null;
  price_low: number | null;
  price_avg30: number | null;
  currency: string;
  source: string;
  /** pagina della carta sulla fonte del prezzo (es. narutocardcollector.com) */
  url?: string | null;
  updated_at: string;
}

export interface UserCard {
  card_id: string;
  status: CardStatus;
  quantity: number;
  notes: string | null;
}

export interface UserPrice {
  card_id: string;
  price: number;
}

export interface SetProgress {
  set_id: string;
  total: number;
  owned: number;
  pending: number;
  owned_value: number;
  missing_value: number;
}

/** Carta arricchita con lo stato dell'utente e il prezzo effettivo */
export interface CardView extends Card {
  status: CardStatus | null;
  quantity: number;
  market: MarketPrice | null;
  userPrice: number | null;
  /** prezzo personale se presente, altrimenti di mercato */
  price: number | null;
}

/** Gruppo di versioni della stessa carta (Normale / Full Art / Holo …) */
export interface CardGroup {
  key: string;
  number: number;
  name: string;
  subtitle: string | null;
  rarity: string | null;
  rarity_rank: number;
  image_url: string | null;
  variants: CardView[];
}
