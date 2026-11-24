import { ArrowRight, Euro, PencilLine } from 'lucide-react';
import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { formatEur, pct } from '../lib/cards';
import { useCollections, useProgress, useSetPreview, useSets } from '../lib/queries';
import type { CardSet, Collection, SetProgress } from '../lib/types';
import { CardFan } from '../ui/CardFan';
import { ErrorBox, FullPageLoader, PageBackground, ProgressBar, ProgressRing, Stat, useDocumentTheme } from '../ui/components';
import { Header } from '../ui/Header';
import { sumProgress } from './HomePage';

function SetCard({ set, collection, progress, index }: { set: CardSet; collection: Collection; progress?: SetProgress; index: number }) {
  const preview = useSetPreview(set.id);
  const p = progress ? pct(progress.owned, progress.total) : 0;
  return (
    <Link
      to={`/c/${collection.id}/${set.id}`}
      className="card-tile panel group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_30px_60px_-30px_var(--glow)]"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="relative bg-[radial-gradient(80%_70%_at_50%_10%,color-mix(in_oklab,var(--accent)_22%,transparent),transparent)] px-8 pt-6">
        <CardFan images={preview.data ?? []} back={set.card_back_url ?? collection.card_back_url} label={set.name} />
        {set.code && <span className="absolute left-4 top-4 rounded-full border border-ink/15 bg-bg/60 px-2.5 py-1 text-[11px] font-bold tracking-wider text-ink/80">{set.code}</span>}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-2xl font-bold italic leading-tight">{set.name}</h3>
            {set.subtitle && <p className="text-sm text-ink/60">{set.subtitle}</p>}
          </div>
          <span className="font-display text-2xl font-semibold tabular-nums text-accent">{p.toLocaleString('it-IT')}%</span>
        </div>
        <ProgressBar value={p} pending={progress ? pct(progress.pending, progress.total) : 0} />
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink/45">Possedute</div>
            <div className="font-semibold tabular-nums">
              {progress?.owned ?? 0}
              <span className="text-ink/45">/{progress?.total ?? 0}</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink/45">In arrivo</div>
            <div className="font-semibold tabular-nums text-amber-300">{progress?.pending ?? 0}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink/45">Valore</div>
            <div className="font-semibold tabular-nums">{progress?.owned_value ? formatEur(progress.owned_value, true) : '—'}</div>
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-ink/10 pt-4 text-xs text-ink/55">
          <span className="flex items-center gap-1.5">
            {set.price_provider === 'tcgdex' ? <Euro className="size-3.5" /> : <PencilLine className="size-3.5" />}
            {set.price_provider === 'tcgdex' ? 'Prezzi Cardmarket automatici' : 'Prezzi inseriti da te'}
          </span>
          <span className="flex items-center gap-1 font-semibold text-ink/80 transition group-hover:translate-x-1 group-hover:text-accent">
            Apri <ArrowRight className="size-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function CollectionPage() {
  const { collectionId } = useParams();
  const collections = useCollections();
  const sets = useSets();
  const progress = useProgress();
  const collection = collections.data?.find((c) => c.id === collectionId);
  useDocumentTheme(collection?.theme);

  const ownSets = useMemo(() => (sets.data ?? []).filter((s) => s.collection_id === collectionId), [sets.data, collectionId]);
  const progressMap = useMemo(() => new Map((progress.data ?? []).map((p) => [p.set_id, p])), [progress.data]);
  const sum = sumProgress(ownSets.map((s) => progressMap.get(s.id)));
  const p = pct(sum.owned, sum.total);

  if (collections.isLoading || sets.isLoading) return <FullPageLoader />;
  if (collections.error || sets.error) return <ErrorBox error={collections.error ?? sets.error} />;
  if (!collection) return <Navigate to="/" replace />;

  return (
    <>
      <PageBackground pattern={collection.theme.pattern} />
      <Header crumbs={[{ label: collection.name }]} />
      <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <section className="flex flex-col gap-8 py-8 sm:flex-row sm:items-end sm:justify-between sm:py-14">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Collezione</p>
            <h1 className="text-gradient mt-2 font-display text-5xl font-bold italic leading-[0.95] tracking-tight sm:text-7xl">{collection.name}</h1>
            {collection.description && <p className="mt-3 max-w-xl text-ink/65">{collection.description}</p>}
            <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 sm:flex sm:flex-wrap">
              <Stat label="Possedute" value={<span className="tabular-nums">{sum.owned}</span>} tone="ok" />
              <Stat label="Mancanti" value={<span className="tabular-nums">{sum.total - sum.owned}</span>} tone="muted" />
              <Stat label="In arrivo" value={<span className="tabular-nums">{sum.pending}</span>} tone="warn" />
              <Stat label="Valore posseduto" value={sum.value > 0 ? formatEur(sum.value) : '—'} />
              <Stat label="Costo per completare" value={sum.missingValue > 0 ? formatEur(sum.missingValue) : '—'} tone="muted" />
            </div>
          </div>
          <ProgressRing value={p} size={148} stroke={11}>
            <div>
              <div className="font-display text-3xl font-bold tabular-nums">{p.toLocaleString('it-IT')}%</div>
              <div className="text-[11px] uppercase tracking-wider text-ink/50">completata</div>
            </div>
          </ProgressRing>
        </section>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ownSets.map((s, i) => (
            <SetCard key={s.id} index={i} set={s} collection={collection} progress={progressMap.get(s.id)} />
          ))}
        </div>
      </main>
    </>
  );
}
