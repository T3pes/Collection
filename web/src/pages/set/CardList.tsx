import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Check } from 'lucide-react';
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

type SortKey = 'number' | 'name' | 'rarity' | 'version' | 'price';
type Sort = { key: SortKey; dir: 1 | -1 } | null;

const collator = new Intl.Collator('it', { sensitivity: 'base', numeric: true });
const byNumber = (a: CardView, b: CardView) =>
  a.number - b.number || collator.compare(a.number_label ?? '', b.number_label ?? '') || collator.compare(a.version, b.version);
const rank = (c: CardView) => c.rarity_rank ?? 99;

const compare: Record<SortKey, (a: CardView, b: CardView) => number> = {
  number: byNumber,
  name: (a, b) => collator.compare(a.name, b.name) || byNumber(a, b),
  rarity: (a, b) => rank(a) - rank(b) || byNumber(a, b),
  version: (a, b) => collator.compare(a.version, b.version) || byNumber(a, b),
  price: (a, b) => (a.price ?? 0) - (b.price ?? 0) || byNumber(a, b),
};

function sortCards(cards: CardView[], sort: Sort): CardView[] {
  if (!sort) return cards;
  const out = [...cards].sort((a, b) => compare[sort.key](a, b) * sort.dir);
  // Le carte senza prezzo restano in fondo in entrambe le direzioni
  if (sort.key === 'price') return [...out.filter((c) => c.price != null), ...out.filter((c) => c.price == null)];
  return out;
}

/** Lista compatta con selezione multipla e colonne ordinabili (Lista acquisti, In arrivo) */
export function CardList({ cards, collection, selected, onSelect, onOpen, action }: Props) {
  const [sort, setSort] = useState<Sort>(null);
  const sorted = useMemo(() => sortCards(cards, sort), [cards, sort]);
  const allOn = cards.length > 0 && cards.every((c) => selected.has(c.id));
  // Primo clic: crescente (prezzo: dal più caro), secondo: inverso, terzo: ordine predefinito
  const toggle = (key: SortKey) =>
    setSort((s) => {
      const first: 1 | -1 = key === 'price' ? -1 : 1;
      if (!s || s.key !== key) return { key, dir: first };
      if (s.dir === first) return { key, dir: (first * -1) as 1 | -1 };
      return null;
    });
  const head = (key: SortKey, label: string, className = '', align: 'left' | 'right' = 'left') => (
    <SortHeader label={label} active={sort?.key === key ? sort.dir : 0} onClick={() => toggle(key)} className={className} align={align} />
  );
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center gap-3 border-b border-ink/10 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink/50">
        <Checkbox checked={allOn} onChange={() => onSelect(cards.map((c) => c.id), !allOn)} label="Seleziona tutte" />
        {head('number', 'N°', 'w-12')}
        {head('name', 'Nome', 'flex-1')}
        {head('rarity', 'Rarità', 'hidden w-36 md:flex')}
        {head('version', 'Versione', 'hidden w-28 sm:flex')}
        {head('price', 'Prezzo', 'w-20', 'right')}
        {action && <span className="w-10" />}
      </div>
      <ul className="divide-y divide-ink/5">
        {sorted.map((c) => {
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
                    <span className="md:hidden">{rarityLabel(collection, c.rarity)}</span>
                    {c.subtitle ? <><span className="md:hidden"> · </span>{c.subtitle}</> : ''}
                    <span className="sm:hidden"> · {c.version}</span>
                  </span>
                </span>
              </button>
              <span className="hidden w-36 truncate text-xs text-ink/70 md:block">{rarityLabel(collection, c.rarity)}</span>
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

function SortHeader({ label, active, onClick, className, align }: { label: string; active: 0 | 1 | -1; onClick: () => void; className: string; align: 'left' | 'right' }) {
  const Icon = active === 1 ? ArrowUp : active === -1 ? ArrowDown : ArrowUpDown;
  const icon = <Icon className={`size-3 shrink-0 ${active ? '' : 'opacity-0 group-hover:opacity-60'}`} />;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ordina per ${label}`}
      aria-sort={active === 1 ? 'ascending' : active === -1 ? 'descending' : 'none'}
      className={`group flex items-center gap-1 uppercase tracking-wider transition hover:text-ink ${align === 'right' ? 'justify-end' : ''} ${active ? 'text-accent' : ''} ${className}`}
    >
      {align === 'right' && icon}
      {label}
      {align === 'left' && icon}
    </button>
  );
}
