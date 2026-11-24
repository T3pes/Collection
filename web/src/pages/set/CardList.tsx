import { Check } from 'lucide-react';
import { cardNumber, formatEur, rarityLabel } from '../../lib/cards';
import type { CardView, Collection } from '../../lib/types';

interface Props {
  cards: CardView[];
  collection?: Collection;
  selected: Set<string>;
  onSelect: (ids: string[], on: boolean) => void;
  onOpen: (c: CardView) => void;
  action?: (c: CardView) => React.ReactNode;
}

/** Lista compatta con selezione multipla (Lista acquisti, In arrivo) */
export function CardList({ cards, collection, selected, onSelect, onOpen, action }: Props) {
  const allOn = cards.length > 0 && cards.every((c) => selected.has(c.id));
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center gap-3 border-b border-ink/10 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink/50">
        <Checkbox checked={allOn} onChange={() => onSelect(cards.map((c) => c.id), !allOn)} label="Seleziona tutte" />
        <span className="w-12">#</span>
        <span className="flex-1">Carta</span>
        <span className="hidden w-28 sm:block">Versione</span>
        <span className="w-20 text-right">Prezzo</span>
        {action && <span className="w-10" />}
      </div>
      <ul className="divide-y divide-ink/5">
        {cards.map((c) => {
          const on = selected.has(c.id);
          return (
            <li key={c.id} className={`flex items-center gap-3 px-4 py-2 transition ${on ? 'bg-accent/10' : 'hover:bg-ink/[0.04]'}`}>
              <Checkbox checked={on} onChange={() => onSelect([c.id], !on)} label={`Seleziona ${c.name}`} />
              <span className="w-12 text-xs tabular-nums text-ink/50">{cardNumber(c)}</span>
              <button onClick={() => onOpen(c)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-ink/10">
                  {c.image_url && <img src={c.image_url} alt="" loading="lazy" className="size-full object-cover" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold hover:text-accent">{c.name}</span>
                  <span className="block truncate text-xs text-ink/50">
                    {rarityLabel(collection, c.rarity)}
                    {c.subtitle ? ` · ${c.subtitle}` : ''}
                    <span className="sm:hidden"> · {c.version}</span>
                  </span>
                </span>
              </button>
              <span className="hidden w-28 text-xs text-ink/70 sm:block">{c.version}</span>
              <span className="w-20 text-right text-sm font-semibold tabular-nums">{formatEur(c.price)}</span>
              {action && <span className="flex w-10 justify-end">{action(c)}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`grid size-5 shrink-0 place-items-center rounded-md border transition ${checked ? 'border-transparent btn-accent' : 'border-ink/25 hover:border-accent/70'}`}
    >
      {checked && <Check className="size-3.5" strokeWidth={3.5} />}
    </button>
  );
}
