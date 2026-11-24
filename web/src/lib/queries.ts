import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { buildViews } from './cards';
import { getRepo } from './repo';
import type { CardStatus, UserCard, UserPrice } from './types';

export const qk = {
  collections: ['collections'] as const,
  sets: ['sets'] as const,
  progress: ['progress'] as const,
  preview: (setId: string) => ['preview', setId] as const,
  cards: (setId: string) => ['cards', setId] as const,
  prices: (setId: string) => ['prices', setId] as const,
  userCards: (setId: string) => ['userCards', setId] as const,
  userPrices: (setId: string) => ['userPrices', setId] as const,
};

export const useCollections = () =>
  useQuery({ queryKey: qk.collections, queryFn: async () => (await getRepo()).listCollections(), staleTime: 10 * 60_000 });

export const useSets = () => useQuery({ queryKey: qk.sets, queryFn: async () => (await getRepo()).listSets(), staleTime: 10 * 60_000 });

export const useProgress = () => useQuery({ queryKey: qk.progress, queryFn: async () => (await getRepo()).setProgress() });

export const useSetPreview = (setId: string) =>
  useQuery({ queryKey: qk.preview(setId), queryFn: async () => (await getRepo()).setPreview(setId, 3), staleTime: 30 * 60_000, enabled: !!setId });

/** Catalogo + stato utente + prezzi di un set, combinati in CardView[] */
export function useSetCards(setId: string) {
  const cards = useQuery({ queryKey: qk.cards(setId), queryFn: async () => (await getRepo()).listCards(setId), staleTime: 30 * 60_000 });
  const prices = useQuery({ queryKey: qk.prices(setId), queryFn: async () => (await getRepo()).listPrices(setId), staleTime: 10 * 60_000 });
  const userCards = useQuery({ queryKey: qk.userCards(setId), queryFn: async () => (await getRepo()).listUserCards(setId) });
  const userPrices = useQuery({ queryKey: qk.userPrices(setId), queryFn: async () => (await getRepo()).listUserPrices(setId) });

  const views = useMemo(
    () => (cards.data ? buildViews(cards.data, userCards.data ?? [], prices.data ?? [], userPrices.data ?? []) : []),
    [cards.data, userCards.data, prices.data, userPrices.data],
  );
  const lastPriceUpdate = useMemo(
    () => (prices.data ?? []).reduce<string | null>((max, p) => (!max || p.updated_at > max ? p.updated_at : max), null),
    [prices.data],
  );

  return {
    views,
    lastPriceUpdate,
    isLoading: cards.isLoading || userCards.isLoading,
    error: cards.error ?? userCards.error ?? prices.error ?? userPrices.error,
  };
}

/** Cambia stato (posseduta / in arrivo / mancante) con aggiornamento ottimistico */
export function useSetStatus(setId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: CardStatus | null }) => (await getRepo()).setStatus(ids, status),
    onMutate: async ({ ids, status }) => {
      await qc.cancelQueries({ queryKey: qk.userCards(setId) });
      const prev = qc.getQueryData<UserCard[]>(qk.userCards(setId));
      const set = new Set(ids);
      qc.setQueryData<UserCard[]>(qk.userCards(setId), (old = []) => {
        const kept = old.filter((u) => !set.has(u.card_id));
        if (status === null) return kept;
        const qty = new Map(old.map((u) => [u.card_id, u.quantity]));
        return [...kept, ...ids.map((card_id) => ({ card_id, status, quantity: qty.get(card_id) ?? 1, notes: null }))];
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(qk.userCards(setId), ctx.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.userCards(setId) });
      qc.invalidateQueries({ queryKey: qk.progress });
    },
  });
}

export function useSetQuantity(setId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => (await getRepo()).setQuantity(id, quantity),
    onMutate: ({ id, quantity }) => {
      const prev = qc.getQueryData<UserCard[]>(qk.userCards(setId));
      qc.setQueryData<UserCard[]>(qk.userCards(setId), (old = []) => old.map((u) => (u.card_id === id ? { ...u, quantity } : u)));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(qk.userCards(setId), ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.progress }),
  });
}

export function useSetUserPrice(setId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number | null }) => (await getRepo()).setUserPrice(id, price),
    onMutate: ({ id, price }) => {
      const prev = qc.getQueryData<UserPrice[]>(qk.userPrices(setId));
      qc.setQueryData<UserPrice[]>(qk.userPrices(setId), (old = []) => {
        const kept = old.filter((p) => p.card_id !== id);
        return price == null ? kept : [...kept, { card_id: id, price }];
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(qk.userPrices(setId), ctx.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.userPrices(setId) });
      qc.invalidateQueries({ queryKey: qk.progress });
    },
  });
}

export function useRefreshPrices(setId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await getRepo()).refreshPrices(setId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.prices(setId) });
      qc.invalidateQueries({ queryKey: qk.cards(setId) });
      qc.invalidateQueries({ queryKey: qk.progress });
    },
  });
}
