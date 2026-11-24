import { ChevronDown, ClipboardCopy, Download, FileSpreadsheet, ListOrdered } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { exportCsv, exportExcel, exportNumericList, numericList } from '../../lib/export';
import type { CardView } from '../../lib/types';
import { useToast } from '../../ui/components';

interface Props {
  cards: CardView[];
  /** cosa si sta esportando, es. "mancanti", "possedute" */
  label: string;
  title: string;
  baseName: string;
  rarity: (r: string | null) => string;
}

/** Menu "Esporta": CSV, Excel, lista numerica, copia negli appunti */
export function ExportMenu({ cards, label, title, baseName, rarity }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    }
    setOpen((o) => !o);
  };
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && !menu.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const hide = () => setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    window.addEventListener('resize', hide);
    window.addEventListener('scroll', hide, { passive: true });
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('resize', hide);
      window.removeEventListener('scroll', hide);
    };
  }, [open]);

  const run = (fn: () => void | Promise<void>) => async () => {
    setOpen(false);
    await fn();
  };

  const items = [
    { icon: Download, text: 'CSV', hint: 'Excel, Google Sheets', act: () => exportCsv(cards, baseName, rarity) },
    { icon: FileSpreadsheet, text: 'Excel', hint: 'file .xls', act: () => exportExcel(cards, baseName, rarity) },
    { icon: ListOrdered, text: 'Lista numerica', hint: 'numeri per rarità e versione (.txt)', act: () => exportNumericList(cards, title, baseName, rarity) },
    {
      icon: ClipboardCopy,
      text: 'Copia lista',
      hint: 'da incollare in chat o annunci',
      act: async () => {
        try {
          await navigator.clipboard.writeText(numericList(cards, title, rarity));
          toast({ text: 'Lista copiata negli appunti' });
        } catch {
          toast({ text: 'Copia non riuscita', tone: 'error' });
        }
      },
    },
  ];

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={toggle}
        disabled={!cards.length}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-10 items-center gap-2 whitespace-nowrap rounded-full border border-ink/10 bg-ink/5 px-4 text-sm font-semibold text-ink/85 transition hover:bg-ink/10 disabled:pointer-events-none disabled:opacity-40"
      >
        <Download className="size-4" /> Esporta {label}
        <span className="rounded-full bg-ink/10 px-1.5 text-[10px] tabular-nums">{cards.length}</span>
        <ChevronDown className={`size-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && pos && createPortal(
        <div ref={menu} role="menu" style={{ top: pos.top, right: pos.right }} className="glass toast-in fixed z-[70] w-64 !bg-[color-mix(in_oklab,var(--bg)_94%,transparent)] max-w-[calc(100vw-16px)] overflow-hidden rounded-2xl p-1.5 shadow-2xl">
          {items.map(({ icon: Icon, text, hint, act }) => (
            <button key={text} role="menuitem" onClick={run(act)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-ink/10">
              <Icon className="size-4 shrink-0 text-accent" />
              <span>
                <span className="block text-sm font-semibold">{text}</span>
                <span className="block text-xs text-ink/50">{hint}</span>
              </span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
