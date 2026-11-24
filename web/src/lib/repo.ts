import type { Card, CardSet, CardStatus, Collection, MarketPrice, SetProgress, UserCard, UserPrice } from './types';

/**
 * Accesso ai dati. Due implementazioni:
 *  - supabaseRepo: dati reali (schema tcg_*)
 *  - demoRepo: dati locali di prova, salvataggio nel browser
 */
export interface Repo {
  mode: 'supabase' | 'demo';
  listCollections(): Promise<Collection[]>;
  listSets(): Promise<CardSet[]>;
  setProgress(): Promise<SetProgress[]>;
  setPreview(setId: string, limit?: number): Promise<string[]>;
  listCards(setId: string): Promise<Card[]>;
  listPrices(setId: string): Promise<MarketPrice[]>;
  listUserCards(setId: string): Promise<UserCard[]>;
  listUserPrices(setId: string): Promise<UserPrice[]>;
  /** status null = rimuove la carta dalla collezione */
  setStatus(cardIds: string[], status: CardStatus | null): Promise<void>;
  setQuantity(cardId: string, quantity: number): Promise<void>;
  setUserPrice(cardId: string, price: number | null): Promise<void>;
  refreshPrices(setId: string): Promise<string>;
}

let current: Promise<Repo> | null = null;

/** Demo se richiesto esplicitamente, oppure in sviluppo locale senza variabili Supabase */
export const isDemo = (): boolean =>
  import.meta.env.VITE_DEMO === 'true' || (import.meta.env.DEV && (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY));

export function getRepo(): Promise<Repo> {
  if (!current) {
    current = isDemo()
      ? import('../demo/demoRepo').then((m) => m.demoRepo)
      : import('./supabaseRepo').then((m) => m.supabaseRepo);
  }
  return current;
}
