import { Clock3, Layers, PackageCheck, RefreshCw, ShoppingCart, SquareStack, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router';
import { formatEur, groupCards, matchesQuery, pct, rarityLabel, sortGroups, versionIndex, type SortKey } from '../lib/cards';
import { fileBaseName } from '../lib/export';
import { useCollections, useRefreshPrices, useSetCards, useSetQuantity, useSets, useSetStatus, useSetUserPrice } from '../lib/queries';
import type { CardGroup, CardStatus, CardView } from '../lib/types';
import { Button, EmptyState, ErrorBox, FullPageLoader, mergeTheme, PageBackground, ProgressRing, SearchInput, Segmented, SelectField, Stat, useDocumentTheme, useToast } from '../ui/components';
import { Header } from '../ui/Header';
import { CardList } from './set/CardList';
import { CardTile } from './set/CardTile';
import { CardViewer } from './set/CardViewer';
import { ExportMenu } from './set/ExportMenu';

type Tab = 'galleria' | 'acquisti' | 'arrivo';
type Stato = 'tutte' | 'possedute' | 'mancanti';

const GROUP_KEY = 'tcg-group-versions';
const readGrouped = () => {
  try {
    return localStorage.getItem(GROUP_KEY) !== '0';
  } catch {
    return true;
  }
};

export default function SetPage() {
  const { collectionId = '', setId = '' } = useParams();
  const collections = useCollections();
  const sets = useSets();
  const collection = collections.data?.find((c) => c.id === collectionId);
  const set = sets.data?.find((s) => s.id === setId && s.collection_id === collectionId);
  const theme = useMemo(() => mergeTheme(collection?.theme, set?.theme), [collection?.theme, set?.theme]);
  useDocumentTheme(collection ? theme : undefined);

  const { views, isLoading, error, lastPriceUpdate } = useSetCards(setId);
  const statusMut = useSetStatus(setId);
  const qtyMut = useSetQuantity(setId);
  const priceMut = useSetUserPrice(setId);
  const refresh = useRefreshPrices(setId);
  const toast = useToast();

  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'galleria';
  const stato = (params.get('stato') as Stato) || 'tutte';
  const setParam = (k: string, v: string, def: string) =>
    setParams(
      (p) => {
        if (v === def) p.delete(k);
        else p.set(k, v);
        return p;
      },
      { replace: true },
    );

  const [q, setQ] = useState('');
  const [rarity, setRarity] = useState('');
  const [version, setVersion] = useState('');
  const [sortChoice, setSort] = useState<SortKey | null>(null);
  const sort: SortKey = sortChoice ?? theme.sort ?? 'number';
  const [grouped, setGrouped] = useState(readGrouped);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewerCard, setViewerCard] = useState<string | null>(null);

  // ---------------- dati derivati ----------------
  const counts = useMemo(() => {
    let owned = 0;
    let pending = 0;
    let ownedValue = 0;
    let missingValue = 0;
    for (const v of views) {
      if (v.status === 'owned') {
        owned++;
        ownedValue += (v.price ?? 0) * v.quantity;
      } else {
        if (v.status === 'pending') pending++;
        missingValue += v.price ?? 0;
      }
    }
    return { total: views.length, owned, pending, missing: views.length - owned, ownedValue, missingValue };
  }, [views]);

  const rarityOptions = useMemo(() => {
    const map = new Map<string, number>();
    views.forEach((v) => v.rarity && map.set(v.rarity, v.rarity_rank ?? 99));
    return [...map.entries()].sort((a, b) => a[1] - b[1]).map(([r]) => ({ value: r, label: rarityLabel(collection, r) }));
  }, [views, collection]);

  const versionOptions = useMemo(
    () => [...new Set(views.map((v) => v.version))].sort((a, b) => versionIndex(collection, a) - versionIndex(collection, b)),
    [views, collection],
  );

  const filtered = useMemo(
    () => views.filter((v) => (!rarity || v.rarity === rarity) && (!version || v.version === version) && matchesQuery(v, q)),
    [views, rarity, version, q],
  );

  const allGroups = useMemo(() => groupCards(views, collection), [views, collection]);
  const groupOf = useMemo(() => {
    const m = new Map<string, CardGroup>();
    allGroups.forEach((g) => g.variants.forEach((v) => m.set(v.id, g)));
    return m;
  }, [allGroups]);

  const galleryGroups = useMemo(() => {
    const base: CardGroup[] = grouped
      ? groupCards(filtered, collection)
      : filtered.map((v) => ({ key: v.id, number: v.number, name: v.name, subtitle: v.subtitle, rarity: v.rarity, rarity_rank: v.rarity_rank ?? 99, image_url: v.image_url, variants: [v] }));
    const byStato = base.filter((g) =>
      stato === 'possedute' ? g.variants.some((v) => v.status === 'owned') : stato === 'mancanti' ? g.variants.some((v) => v.status !== 'owned') : true,
    );
    return sortGroups(byStato, sort);
  }, [filtered, grouped, stato, sort, collection]);

  const listSort = (a: CardView, b: CardView) =>
    (a.rarity_rank ?? 99) - (b.rarity_rank ?? 99) || a.number - b.number || versionIndex(collection, a.version) - versionIndex(collection, b.version);
  const shopping = useMemo(() => filtered.filter((v) => v.status == null).sort(listSort), [filtered]); // eslint-disable-line react-hooks/exhaustive-deps
  const arriving = useMemo(() => filtered.filter((v) => v.status === 'pending').sort(listSort), [filtered]); // eslint-disable-line react-hooks/exhaustive-deps

  const galleryExport = useMemo(
    () =>
      filtered
        .filter((v) => (stato === 'possedute' ? v.status === 'owned' : stato === 'mancanti' ? v.status !== 'owned' : true))
        .sort(listSort),
    [filtered, stato], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ---------------- viewer ----------------
  const sequence: CardGroup[] = useMemo(() => {
    if (tab === 'galleria') return galleryGroups;
    const list = tab === 'acquisti' ? shopping : arriving;
    const seen = new Set<string>();
    const out: CardGroup[] = [];
    list.forEach((v) => {
      const g = groupOf.get(v.id);
      if (g && !seen.has(g.key)) {
        seen.add(g.key);
        out.push(g);
      }
    });
    return out;
  }, [tab, galleryGroups, shopping, arriving, groupOf]);

  const viewerGroup = viewerCard ? (groupOf.get(viewerCard) ?? null) : null;
  // in modalità "versioni separate" il dettaglio mostra comunque tutte le versioni della carta
  const viewerIndex = viewerGroup ? sequence.findIndex((g) => g.variants.some((v) => viewerGroup.variants.some((x) => x.id === v.id))) : -1;
  const openGroup = useCallback((g: CardGroup) => setViewerCard(g.variants[0].id), []);
  const goto = (i: number) => sequence[i] && setViewerCard(sequence[i].variants[0].id);

  // ---------------- azioni ----------------
  const changeStatus = useCallback(
    (ids: string[], status: CardStatus | null, undo?: { label: string; prev: Map<string, CardStatus | null> }) => {
      statusMut.mutate(
        { ids, status },
        {
          onSuccess: () => {
            if (!undo) return;
            toast({
              text: undo.label,
              action: {
                label: 'Annulla',
                run: () => {
                  const byStatus = new Map<CardStatus | null, string[]>();
                  undo.prev.forEach((s, id) => byStatus.set(s, [...(byStatus.get(s) ?? []), id]));
                  byStatus.forEach((list, s) => statusMut.mutate({ ids: list, status: s }));
                },
              },
            });
          },
          onError: (e) => toast({ text: e instanceof Error ? e.message : 'Impossibile aggiornare lo stato.', tone: 'error' }),
        },
      );
    },
    [statusMut, toast],
  );

  const toggle = useCallback(
    (v: CardView) => {
      const next: CardStatus | null = v.status === 'owned' ? null : 'owned';
      const label = next === 'owned' ? `${v.name} (${v.version}) aggiunta` : `${v.name} (${v.version}) rimossa`;
      changeStatus([v.id], next, { label, prev: new Map([[v.id, v.status]]) });
    },
    [changeStatus],
  );

  const bulk = (status: CardStatus | null, label: string) => {
    const ids = [...selected];
    const prev = new Map(ids.map((id) => [id, views.find((v) => v.id === id)?.status ?? null]));
    changeStatus(ids, status, { label: `${ids.length} ${label}`, prev });
    setSelected(new Set());
  };

  const onSelect = (ids: string[], on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      ids.forEach((id) => (on ? n.add(id) : n.delete(id)));
      return n;
    });

  const changeTab = (t: Tab) => {
    setSelected(new Set());
    setParam('tab', t, 'galleria');
  };

  // ---------------- render ----------------
  if (collections.isLoading || sets.isLoading) return <FullPageLoader />;
  if (collections.error || sets.error) return <ErrorBox error={collections.error ?? sets.error} />;
  if (!collection || !set) return <Navigate to={collection ? `/c/${collection.id}` : '/'} replace />;

  const p = pct(counts.owned, counts.total);
  const rarityText = (r: string | null) => rarityLabel(collection, r);
  const exportTitle = `${collection.name} — ${set.name}${set.subtitle ? ` (${set.subtitle})` : ''}`;
  const exportWhat =
    tab === 'galleria' ? (stato === 'possedute' ? 'possedute' : stato === 'mancanti' ? 'mancanti' : 'tutte') : tab === 'acquisti' ? 'da acquistare' : 'in arrivo';
  const exportBase = fileBaseName(`${set.name} ${set.subtitle ?? ''} ${exportWhat}`);
  const listCards = tab === 'acquisti' ? shopping : arriving;
  const selectedCards = listCards.filter((c) => selected.has(c.id));
  const listTotal = (selectedCards.length ? selectedCards : listCards).reduce((s, c) => s + (c.price ?? 0), 0);
  const noPrice = (selectedCards.length ? selectedCards : listCards).filter((c) => c.price == null).length;
  const exportCards = tab === 'galleria' ? galleryExport : selectedCards.length ? selectedCards : listCards;
  const exportLabel = tab !== 'galleria' && selectedCards.length ? 'selezionate' : exportWhat;

  return (
    <>
      <PageBackground pattern={theme.pattern} />
      <Header crumbs={[{ label: collection.name, to: `/c/${collection.id}` }, { label: `${set.name}${set.code ? ` · ${set.code}` : ''}` }]} />

      <main className="mx-auto max-w-7xl px-4 pb-28 sm:px-6">
        {/* ---------- hero ---------- */}
        <section className="flex items-start justify-between gap-4 py-7 sm:items-center sm:py-12">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">{set.subtitle ?? collection.name}</p>
            <h1 className="text-gradient mt-2 font-display text-5xl font-bold italic leading-[0.95] tracking-tight sm:text-6xl">{set.name}</h1>
            <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 sm:flex sm:flex-wrap">
              <Stat label="Possedute" value={<span className="tabular-nums">{counts.owned}<span className="text-base text-ink/40">/{counts.total}</span></span>} tone="ok" />
              <Stat label="In arrivo" value={<span className="tabular-nums">{counts.pending}</span>} tone="warn" />
              <Stat label="Valore posseduto" value={counts.ownedValue > 0 ? formatEur(counts.ownedValue) : '—'} />
              <Stat label="Costo mancanti" value={counts.missingValue > 0 ? formatEur(counts.missingValue) : '—'} tone="muted" />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ink/50">
              {set.price_provider === 'tcgdex' ? (
                <>
                  <span>
                    Prezzi Cardmarket (trend){lastPriceUpdate ? ` · aggiornati il ${new Date(lastPriceUpdate).toLocaleDateString('it-IT')}` : ' · non ancora scaricati'}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={refresh.isPending}
                    onClick={() =>
                      refresh.mutate(undefined, {
                        onSuccess: (m) => toast({ text: m }),
                        onError: (e) => toast({ text: e instanceof Error ? e.message : 'Errore', tone: 'error' }),
                      })
                    }
                  >
                    {!refresh.isPending && <RefreshCw className="size-3.5" />} Aggiorna prezzi
                  </Button>
                </>
              ) : (
                <span>Nessun listino automatico per questo set: inserisci i prezzi dal dettaglio di ogni carta.</span>
              )}
            </div>
          </div>
          <div className="hidden sm:block">
            <ProgressRing value={p} size={140} stroke={10}>
              <div>
                <div className="font-display text-3xl font-bold tabular-nums">{p.toLocaleString('it-IT')}%</div>
                <div className="text-[11px] uppercase tracking-wider text-ink/50">completato</div>
              </div>
            </ProgressRing>
          </div>
          <div className="shrink-0 sm:hidden">
            <ProgressRing value={p} size={76} stroke={7}>
              <div className="font-display text-base font-bold tabular-nums">{Math.round(p)}%</div>
            </ProgressRing>
          </div>
        </section>

        {/* ---------- tab + filtri ---------- */}
        <div className="glass relative z-30 mb-8 flex flex-col gap-3 rounded-3xl p-3 sm:sticky sm:top-20">
          <div className="scrollbar-none -mx-3 flex items-center justify-between gap-3 overflow-x-auto px-3">
            <Segmented<Tab>
              value={tab}
              onChange={changeTab}
              options={[
                { value: 'galleria', label: <><SquareStack className="size-4" /> Galleria</> },
                { value: 'acquisti', label: <><ShoppingCart className="size-4" /> <span className="sm:hidden">Acquisti</span><span className="hidden sm:inline">Lista acquisti</span></>, count: counts.total - counts.owned - counts.pending },
                { value: 'arrivo', label: <><Clock3 className="size-4" /> In arrivo</>, count: counts.pending },
              ]}
            />
            {tab === 'galleria' && (
              <Segmented<Stato>
                value={stato}
                onChange={(v) => setParam('stato', v, 'tutte')}
                options={[
                  { value: 'tutte', label: 'Tutte', count: counts.total },
                  { value: 'possedute', label: 'Possedute', count: counts.owned },
                  { value: 'mancanti', label: 'Mancanti', count: counts.missing },
                ]}
              />
            )}
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <SearchInput value={q} onChange={setQ} placeholder="Cerca per nome o numero…" />
            <div className="scrollbar-none -mx-3 flex items-center gap-2 overflow-x-auto px-3 lg:mx-0 lg:overflow-visible lg:px-0">
            <SelectField label="Rarità" value={rarity} onChange={setRarity} options={[{ value: '', label: 'Tutte le rarità' }, ...rarityOptions]} />
            {versionOptions.length > 1 && (
              <SelectField label="Versione" value={version} onChange={setVersion} options={[{ value: '', label: 'Tutte le versioni' }, ...versionOptions.map((v) => ({ value: v, label: v }))]} />
            )}
            {tab === 'galleria' && (
              <>
                <SelectField
                  label="Ordina"
                  value={sort}
                  onChange={(v) => setSort(v as SortKey)}
                  options={[
                    { value: 'number', label: 'Ordine: numero' },
                    { value: 'rarity', label: 'Ordine: rarità' },
                    { value: 'rare', label: 'Ordine: più rare' },
                    { value: 'price', label: 'Ordine: prezzo' },
                  ]}
                />
                {versionOptions.length > 1 && (
                  <Button
                    variant={grouped ? 'soft' : 'ghost'}
                    onClick={() =>
                      setGrouped((g) => {
                        try {
                          localStorage.setItem(GROUP_KEY, g ? '0' : '1');
                        } catch {
                          /* ignore */
                        }
                        return !g;
                      })
                    }
                    title="Mostra le versioni (Normale, Full Art, Holo…) raggruppate in una sola carta o separate"
                  >
                    <Layers className="size-4" /> {grouped ? 'Versioni raggruppate' : 'Versioni separate'}
                  </Button>
                )}
              </>
            )}
            <div className="lg:ml-auto">
              <ExportMenu cards={exportCards} label={exportLabel} title={`${exportTitle} — ${exportWhat}`} baseName={exportBase} rarity={rarityText} />
            </div>
            </div>
          </div>
        </div>

        {/* ---------- contenuto ---------- */}
        {isLoading ? (
          <FullPageLoader label="Caricamento carte…" />
        ) : error ? (
          <ErrorBox error={error} />
        ) : tab === 'galleria' ? (
          galleryGroups.length === 0 ? (
            <EmptyState
              title={stato === 'mancanti' && !q && !rarity && !version ? 'Set completo! 🎉' : 'Nessuna carta trovata'}
              text={stato === 'mancanti' && !q && !rarity && !version ? 'Hai tutte le carte di questo set.' : 'Prova a cambiare ricerca o filtri.'}
            />
          ) : (
            <div className="card-grid">
              {galleryGroups.map((g, i) => (
                <CardTile key={g.key} group={g} index={i} collection={collection} onOpen={openGroup} onToggle={toggle} />
              ))}
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-ink/70">
                <span className="font-semibold text-ink">{selectedCards.length ? `${selectedCards.length} selezionate` : `${listCards.length} carte`}</span>
                {' · '}totale <span className="font-semibold text-ink">{formatEur(listTotal)}</span>
                {noPrice > 0 && <span className="text-ink/45"> ({noPrice} senza prezzo)</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {tab === 'acquisti' ? (
                  <>
                    <Button variant="soft" size="sm" disabled={!selected.size} onClick={() => bulk('pending', 'carte messe in arrivo')}>
                      <Clock3 className="size-4" /> Metti in arrivo
                    </Button>
                    <Button variant="accent" size="sm" disabled={!selected.size} onClick={() => bulk('owned', 'carte aggiunte')}>
                      <PackageCheck className="size-4" /> Segna come possedute
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="danger" size="sm" disabled={!selected.size} onClick={() => bulk(null, 'carte tolte da "in arrivo"')}>
                      <Trash2 className="size-4" /> Rimuovi
                    </Button>
                    <Button variant="accent" size="sm" disabled={!selected.size} onClick={() => bulk('owned', 'carte arrivate e aggiunte')}>
                      <PackageCheck className="size-4" /> Arrivate: aggiungi alla collezione
                    </Button>
                  </>
                )}
              </div>
            </div>

            {listCards.length === 0 ? (
              tab === 'acquisti' ? (
                <EmptyState title="Niente da comprare 🎉" text={q || rarity || version ? 'Nessuna carta mancante con questi filtri.' : 'Ti mancano solo carte già in arrivo.'} />
              ) : (
                <EmptyState title="Nessuna carta in arrivo" text="Dalla Lista acquisti seleziona le carte ordinate e premi «Metti in arrivo»." />
              )
            ) : (
              <CardList
                cards={listCards}
                collection={collection}
                selected={selected}
                onSelect={onSelect}
                onOpen={(c) => setViewerCard(c.id)}
                action={
                  tab === 'acquisti'
                    ? (c) => (
                        <button
                          className="grid size-8 place-items-center rounded-full text-amber-200 hover:bg-amber-300/15"
                          title="Metti in arrivo"
                          aria-label={`Metti in arrivo ${c.name}`}
                          onClick={() => changeStatus([c.id], 'pending', { label: `${c.name} in arrivo`, prev: new Map([[c.id, c.status]]) })}
                        >
                          <Clock3 className="size-4" />
                        </button>
                      )
                    : (c) => (
                        <button
                          className="grid size-8 place-items-center rounded-full text-emerald-300 hover:bg-emerald-400/15"
                          title="Arrivata: aggiungi alla collezione"
                          aria-label={`Segna ${c.name} come arrivata`}
                          onClick={() => changeStatus([c.id], 'owned', { label: `${c.name} aggiunta`, prev: new Map([[c.id, c.status]]) })}
                        >
                          <PackageCheck className="size-4" />
                        </button>
                      )
                }
              />
            )}
          </div>
        )}
      </main>

      <CardViewer
        group={viewerGroup}
        collection={collection}
        set={set}
        onClose={() => setViewerCard(null)}
        onPrev={viewerIndex > 0 ? () => goto(viewerIndex - 1) : undefined}
        onNext={viewerIndex >= 0 && viewerIndex < sequence.length - 1 ? () => goto(viewerIndex + 1) : undefined}
        onStatus={(v, s) =>
          changeStatus([v.id], s, {
            label: s === 'owned' ? `${v.name} (${v.version}) aggiunta` : s === 'pending' ? `${v.name} (${v.version}) in arrivo` : `${v.name} (${v.version}) segnata come mancante`,
            prev: new Map([[v.id, v.status]]),
          })
        }
        onQuantity={(v, n) => qtyMut.mutate({ id: v.id, quantity: n })}
        onPrice={(v, price) =>
          priceMut.mutate(
            { id: v.id, price },
            { onError: (e) => toast({ text: e instanceof Error ? e.message : 'Prezzo non salvato', tone: 'error' }) },
          )
        }
      />
    </>
  );
}
