import { Check, Clock3, Plus } from 'lucide-react';
import { memo } from 'react';
import { cardNumber, formatEur, isFoil, rarityLabel } from '../../lib/cards';
import type { CardGroup, CardView, Collection } from '../../lib/types';
import { PerspectiveCard } from '../../ui/PerspectiveCard';

const SHORT: Record<string, string> = { normale: 'N', 'full art': 'FA', holo: 'H', reverse: 'R' };
export const shortVersion = (v: string) => SHORT[v.toLowerCase()] ?? v.slice(0, 2).toUpperCase();

interface Props {
  group: CardGroup;
  collection?: Collection;
  index: number;
  onOpen: (g: CardGroup) => void;
  onToggle: (v: CardView) => void;
}

/** Tessera della galleria: una carta con i chip delle sue versioni */
export const CardTile = memo(function CardTile({ group, collection, index, onOpen, onToggle }: Props) {
  const owned = group.variants.filter((v) => v.status === 'owned').length;
  const pending = group.variants.filter((v) => v.status === 'pending').length;
  const all = owned === group.variants.length;
  const prices = group.variants.map((v) => v.price).filter((p): p is number => p != null);
  const top = prices.length ? Math.max(...prices) : null;
  const single = group.variants.length === 1;
  const v0 = group.variants[0];

  return (
    <div className="card-tile flex flex-col" style={{ animationDelay: `${Math.min(index, 18) * 35}ms` }}>
      <PerspectiveCard
        image={group.image_url}
        alt={`${cardNumber(v0)} ${group.name}`}
        foil={isFoil(collection, v0)}
        dimmed={owned === 0}
        onClick={() => onOpen(group)}
        ariaLabel={`Apri ${group.name} ${cardNumber(v0)}`}
        overlay={
          <>
            {all ? (
              <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-emerald-400 text-emerald-950 shadow-lg" style={{ transform: 'translateZ(20px)' }}>
                <Check className="size-4" strokeWidth={3} />
              </span>
            ) : owned > 0 ? (
              <span className="absolute right-2 top-2 rounded-full bg-emerald-400/95 px-2 py-0.5 text-[11px] font-bold text-emerald-950 shadow-lg">
                {owned}/{group.variants.length}
              </span>
            ) : null}
            {pending > 0 && (
              <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-bold text-amber-950 shadow-lg">
                <Clock3 className="size-3" /> In arrivo
              </span>
            )}
          </>
        }
      />

      <div className="mt-3 flex items-baseline justify-between gap-2 text-[11px] font-semibold tabular-nums">
        <span className="text-ink/50">{cardNumber(v0)}</span>
        {top != null && <span className="rounded-full bg-ink/8 px-2 py-0.5 text-ink/85">{prices.length > 1 && Math.min(...prices) !== top ? `fino a ${formatEur(top)}` : formatEur(top)}</span>}
      </div>
      <button onClick={() => onOpen(group)} className="mt-0.5 truncate text-left text-sm font-semibold leading-snug hover:text-accent" title={group.name}>
        {group.name}
      </button>
      <div className="truncate text-xs text-ink/50" title={group.subtitle ?? undefined}>
        {rarityLabel(collection, group.rarity)}
        {group.subtitle ? ` · ${group.subtitle}` : ''}
      </div>

      <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${single ? 1 : group.variants.length}, minmax(0, 1fr))` }}>
        {single ? (
          <VariantChip v={v0} wide onToggle={onToggle} />
        ) : (
          group.variants.map((v) => <VariantChip key={v.id} v={v} compact={group.variants.length > 2} onToggle={onToggle} />)
        )}
      </div>
    </div>
  );
});

const COMPACT: Record<string, string> = { normale: 'Norm.' };

function VariantChip({ v, wide, compact, onToggle }: { v: CardView; wide?: boolean; compact?: boolean; onToggle: (v: CardView) => void }) {
  const st = v.status;
  const cls =
    st === 'owned'
      ? 'bg-emerald-400/15 text-emerald-200 border-emerald-300/40 hover:bg-emerald-400/25'
      : st === 'pending'
        ? 'bg-amber-300/15 text-amber-200 border-amber-300/40 hover:bg-amber-300/25'
        : 'bg-transparent text-ink/60 border-ink/15 hover:border-accent/60 hover:text-ink';
  const title = `${v.version}: ${st === 'owned' ? 'posseduta — clic per rimuovere' : st === 'pending' ? 'in arrivo — clic per segnare come arrivata' : 'mancante — clic per aggiungere'}`;
  const Icon = st === 'owned' ? Check : st === 'pending' ? Clock3 : Plus;
  return (
    <button
      onClick={() => onToggle(v)}
      title={title}
      aria-label={title}
      aria-pressed={st === 'owned'}
      className={`flex h-7 w-full min-w-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border font-semibold transition active:scale-95 ${compact ? 'px-1 text-[10px]' : 'px-2 text-[11px]'} ${cls}`}
    >
      <Icon className={`${compact ? 'size-2.5' : 'size-3'} shrink-0`} strokeWidth={3} />
      {wide ? (
        st === 'owned' ? (
          "Ce l'ho"
        ) : st === 'pending' ? (
          'In arrivo'
        ) : (
          'Mi manca'
        )
      ) : (
        <>
          <span className="sm:hidden">{shortVersion(v.version)}</span>
          <span className="hidden sm:inline">{compact ? (COMPACT[v.version.toLowerCase()] ?? v.version) : v.version}</span>
        </>
      )}
    </button>
  );
}
