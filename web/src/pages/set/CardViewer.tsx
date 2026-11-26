import { ChevronLeft, ChevronRight, ExternalLink, Minus, Plus, RotateCw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cardNumber, formatEur, isFoil, marketSearchUrl, priceSource, rarityLabel } from '../../lib/cards';
import type { CardGroup, CardSet, CardStatus, CardView, Collection } from '../../lib/types';
import { PerspectiveCard } from '../../ui/PerspectiveCard';

interface Props {
  group: CardGroup | null;
  collection?: Collection;
  set?: CardSet;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onStatus: (v: CardView, status: CardStatus | null) => void;
  onQuantity: (v: CardView, qty: number) => void;
  onPrice: (v: CardView, price: number | null) => void;
}

/** Dettaglio carta a tutto schermo: carta grande inclinabile, retro, versioni, prezzi */
export function CardViewer({ group, collection, set, onClose, onPrev, onNext, onStatus, onQuantity, onPrice }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (group && !d.open) d.showModal();
    if (!group && d.open) d.close();
  }, [group]);

  useEffect(() => setFlipped(false), [group?.key]);

  useEffect(() => {
    if (!group) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') onPrev?.();
      if (e.key === 'ArrowRight') onNext?.();
      if (e.key.toLowerCase() === 'f') setFlipped((f) => !f);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [group, onPrev, onNext]);

  const v0 = group?.variants[0];
  const market = v0 ? marketSearchUrl(collection, v0, set?.name) : null;
  const marketName = collection?.market_search_url?.includes('cardmarket') ? 'Cardmarket' : collection?.market_search_url?.includes('ebay') ? 'eBay' : 'mercato';

  return (
    <dialog
      ref={dialog}
      className="viewer"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-label={group ? `${group.name} ${v0 ? cardNumber(v0) : ''}` : 'Dettaglio carta'}
    >
      {group && v0 && (
        <div className="flex h-full w-full items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-8" onClick={(e) => e.target === e.currentTarget && onClose()}>
          <div key={group.key} className="viewer-in grid w-full max-w-5xl gap-6 sm:gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center">
            {/* carta */}
            <div className="relative mx-auto w-[min(76vw,380px)] pt-10 md:w-full md:max-w-[420px] md:pt-0">
              <PerspectiveCard
                image={group.image_url}
                alt={`${group.name} ${cardNumber(v0)}`}
                back={set?.card_back_url ?? collection?.card_back_url}
                backLabel={collection?.name}
                flipped={flipped}
                foil={isFoil(collection, v0)}
                intensity={2.5}
                zoomOnHover={10}
                eager
                onClick={() => setFlipped((f) => !f)}
                ariaLabel="Gira la carta"
              />
              <button onClick={() => setFlipped((f) => !f)} className="mx-auto mt-4 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-ink/60 hover:bg-ink/10 hover:text-ink">
                <RotateCw className="size-3.5" /> Gira la carta <kbd className="rounded bg-ink/10 px-1.5 text-[10px]">F</kbd>
              </button>
            </div>

            {/* dettagli */}
            <div className="panel glass p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    {cardNumber(v0)} · {rarityLabel(collection, group.rarity)}
                  </div>
                  <h2 className="mt-1 font-display text-3xl font-bold italic leading-tight sm:text-4xl">{group.name}</h2>
                  {group.subtitle && <p className="mt-1 text-ink/65">{group.subtitle}</p>}
                  <p className="mt-2 text-xs text-ink/45">
                    {[set?.name, set?.subtitle, v0.type, v0.variant].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full bg-ink/10 hover:bg-ink/20" aria-label="Chiudi">
                  <X className="size-5" />
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {group.variants.map((v) => (
                  <VariantRow key={v.id} v={v} manual={set?.price_provider !== 'tcgdex'} onStatus={onStatus} onQuantity={onQuantity} onPrice={onPrice} />
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-5">
                {market ? (
                  <a href={market} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
                    Cerca su {marketName} <ExternalLink className="size-3.5" />
                  </a>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  <button onClick={onPrev} disabled={!onPrev} className="grid size-10 place-items-center rounded-full bg-ink/10 hover:bg-ink/20 disabled:opacity-30" aria-label="Carta precedente">
                    <ChevronLeft className="size-5" />
                  </button>
                  <button onClick={onNext} disabled={!onNext} className="grid size-10 place-items-center rounded-full bg-ink/10 hover:bg-ink/20 disabled:opacity-30" aria-label="Carta successiva">
                    <ChevronRight className="size-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}

const STATUS_OPTS: { value: CardStatus | null; label: string; cls: string }[] = [
  { value: null, label: 'Mi manca', cls: 'bg-ink/15 text-ink' },
  { value: 'pending', label: 'In arrivo', cls: 'bg-amber-300 text-amber-950' },
  { value: 'owned', label: "Ce l'ho", cls: 'bg-emerald-400 text-emerald-950' },
];

function VariantRow({ v, manual, onStatus, onQuantity, onPrice }: { v: CardView; manual: boolean; onStatus: Props['onStatus']; onQuantity: Props['onQuantity']; onPrice: Props['onPrice'] }) {
  const [draft, setDraft] = useState(v.userPrice != null ? String(v.userPrice).replace('.', ',') : '');
  useEffect(() => setDraft(v.userPrice != null ? String(v.userPrice).replace('.', ',') : ''), [v.userPrice]);

  const commit = () => {
    const clean = draft.replace(/[€\s]/g, '').replace(',', '.');
    if (clean === '') {
      if (v.userPrice != null) onPrice(v, null);
      return;
    }
    const n = Number(clean);
    if (Number.isFinite(n) && n >= 0 && n !== v.userPrice) onPrice(v, Math.round(n * 100) / 100);
  };

  return (
    <div className="rounded-2xl border border-ink/10 bg-ink/[0.03] p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-semibold">{v.version}</div>
        <div className="flex rounded-full bg-ink/5 p-1" role="radiogroup" aria-label={`Stato ${v.version}`}>
          {STATUS_OPTS.map((o) => {
            const active = v.status === o.value;
            return (
              <button
                key={o.label}
                role="radio"
                aria-checked={active}
                onClick={() => !active && onStatus(v, o.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? o.cls : 'text-ink/60 hover:text-ink'}`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {v.status === 'owned' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink/50">Copie</span>
            <div className="flex items-center rounded-full bg-ink/8">
              <button className="grid size-7 place-items-center rounded-full hover:bg-ink/15 disabled:opacity-30" disabled={v.quantity <= 1} onClick={() => onQuantity(v, v.quantity - 1)} aria-label="Una copia in meno">
                <Minus className="size-3.5" />
              </button>
              <span className="w-6 text-center font-semibold tabular-nums">{v.quantity}</span>
              <button className="grid size-7 place-items-center rounded-full hover:bg-ink/15" onClick={() => onQuantity(v, v.quantity + 1)} aria-label="Una copia in più">
                <Plus className="size-3.5" />
              </button>
            </div>
            {v.quantity > 1 && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">{v.quantity - 1} doppie</span>}
          </div>
        )}
        {(!manual || v.market) && (
          <div className="flex items-center gap-2">
            {v.market?.url ? (
              <a href={v.market.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-ink/50 hover:text-accent hover:underline" title="Vedi le vendite su questo sito">
                {priceSource(v.market.source)?.name ?? v.market.source} <ExternalLink className="size-3" />
              </a>
            ) : (
              <span className="text-xs text-ink/50">{priceSource(v.market?.source)?.name ?? 'Cardmarket'}</span>
            )}
            <span className="font-semibold tabular-nums">{formatEur(v.market?.price)}</span>
            {v.market?.price_low != null && <span className="text-xs text-ink/45">min {formatEur(v.market.price_low)}</span>}
          </div>
        )}
        <label className="flex items-center gap-2">
          <span className="text-xs text-ink/50">{manual ? 'Prezzo' : 'Il tuo prezzo'}</span>
          <span className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink/45">€</span>
            <input
              inputMode="decimal"
              value={draft}
              placeholder={manual ? '0,00' : 'auto'}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
              className="h-8 w-24 rounded-full border border-ink/15 bg-transparent pl-6 pr-3 text-sm tabular-nums outline-none focus:border-accent/70"
              aria-label={`Prezzo ${v.version}`}
            />
          </span>
        </label>
      </div>
    </div>
  );
}
