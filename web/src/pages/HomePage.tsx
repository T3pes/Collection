import { ArrowUpRight, Layers } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { formatEur, pct } from '../lib/cards';
import { useCollections, useProgress, useSetPreview, useSets } from '../lib/queries';
import type { CardSet, Collection, SetProgress } from '../lib/types';
import { CardFan } from '../ui/CardFan';
import { EmptyState, ErrorBox, FullPageLoader, PageBackground, ProgressBar, Stat, themeVars, useDocumentTheme } from '../ui/components';
import { Header } from '../ui/Header';

export function sumProgress(rows: (SetProgress | undefined)[]) {
  return rows.reduce(
    (a, p) => (p ? { total: a.total + p.total, owned: a.owned + p.owned, pending: a.pending + p.pending, value: a.value + p.owned_value, missingValue: a.missingValue + p.missing_value } : a),
    { total: 0, owned: 0, pending: 0, value: 0, missingValue: 0 },
  );
}

function CollectionCard({ collection, sets, progress, index }: { collection: Collection; sets: CardSet[]; progress: Map<string, SetProgress>; index: number }) {
  const featured = sets[sets.length - 1] ?? sets[0];
  const preview = useSetPreview(featured?.id ?? '');
  const sum = sumProgress(sets.map((s) => progress.get(s.id)));
  const p = pct(sum.owned, sum.total);

  return (
    <Link
      to={`/c/${collection.id}`}
      style={{ ...themeVars(collection.theme), animationDelay: `${index * 90}ms` }}
      className="card-tile group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-white/10 text-[var(--ink)] transition hover:border-[color:var(--accent)]/50"
    >
      <div
        className="absolute inset-0 -z-10 transition duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(120% 90% at 50% 0%, color-mix(in oklab, var(--accent) 34%, transparent), transparent 62%), linear-gradient(180deg, var(--bg-2), var(--bg))`,
        }}
      />
      <div className="px-6 pt-8 sm:px-10">
        <CardFan images={preview.data ?? []} back={collection.card_back_url ?? collection.logo_url} label={collection.name} size="lg" />
      </div>
      <div className="mt-2 flex flex-1 flex-col gap-4 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-3xl font-bold italic leading-none tracking-tight sm:text-4xl">{collection.name}</h2>
            {collection.description && <p className="mt-2 line-clamp-2 text-sm text-[var(--ink)]/65">{collection.description}</p>}
          </div>
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--ink)]/10 transition group-hover:rotate-45 group-hover:bg-[var(--accent)] group-hover:text-[var(--bg)]">
            <ArrowUpRight className="size-5" />
          </span>
        </div>
        <ProgressBar value={p} pending={pct(sum.pending, sum.total)} />
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Completo" value={`${p.toLocaleString('it-IT')}%`} tone="accent" />
          <Stat label="Possedute" value={<span className="tabular-nums">{sum.owned}<span className="text-base text-[var(--ink)]/45">/{sum.total}</span></span>} />
          <Stat label="Valore" value={sum.value > 0 ? formatEur(sum.value, true) : '—'} />
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--ink)]/55">
          <Layers className="size-3.5" /> {sets.length} {sets.length === 1 ? 'set' : 'set'} · {sets.map((s) => s.name).filter((v, i, a) => a.indexOf(v) === i).join(' · ')}
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  useDocumentTheme(null);
  const collections = useCollections();
  const sets = useSets();
  const progress = useProgress();

  const progressMap = useMemo(() => new Map((progress.data ?? []).map((p) => [p.set_id, p])), [progress.data]);
  const total = sumProgress(progress.data ?? []);

  return (
    <>
      <PageBackground />
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <section className="py-10 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">La tua vetrina</p>
          <h1 className="text-gradient mt-3 font-display text-5xl font-bold italic leading-[0.95] tracking-tight sm:text-7xl">Le tue collezioni</h1>
          {progress.data && (
            <div className="mt-8 grid grid-cols-2 gap-x-10 gap-y-4 sm:flex sm:flex-wrap">
              <Stat label="Carte possedute" value={<span className="tabular-nums">{total.owned.toLocaleString('it-IT')}</span>} />
              <Stat label="Mancanti" value={<span className="tabular-nums">{(total.total - total.owned).toLocaleString('it-IT')}</span>} tone="muted" />
              <Stat label="In arrivo" value={<span className="tabular-nums">{total.pending}</span>} tone="warn" />
              <Stat label="Valore stimato" value={formatEur(total.value)} tone="ok" />
            </div>
          )}
        </section>

        {collections.isLoading || sets.isLoading ? (
          <FullPageLoader />
        ) : collections.error || sets.error ? (
          <ErrorBox error={collections.error ?? sets.error} onRetry={() => (collections.refetch(), sets.refetch())} />
        ) : !collections.data?.length ? (
          <EmptyState title="Nessuna collezione" text="Aggiungi una collezione in catalog/collections.json e lancia npm run catalog:sync." />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {collections.data.map((c, i) => (
              <CollectionCard key={c.id} index={i} collection={c} sets={(sets.data ?? []).filter((s) => s.collection_id === c.id)} progress={progressMap} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
