import { Loader2, Search, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import type { CollectionTheme } from '../lib/types';

// ---------------------------------------------------------------------------
// Tema della collezione → variabili CSS
// ---------------------------------------------------------------------------
export function themeVars(theme?: CollectionTheme | null): CSSProperties {
  if (!theme) return {};
  const v: Record<string, string> = {};
  if (theme.accent) v['--accent'] = theme.accent;
  if (theme.accent2) v['--accent-2'] = theme.accent2;
  if (theme.ink) v['--ink'] = theme.ink;
  if (theme.bg) v['--bg'] = theme.bg;
  if (theme.bg2) v['--bg-2'] = theme.bg2;
  if (theme.glow) v['--glow'] = theme.glow;
  return v as CSSProperties;
}

/** Applica il tema a tutta la pagina (anche a body e ai dialog) */
export function useDocumentTheme(theme?: CollectionTheme | null) {
  useEffect(() => {
    const root = document.documentElement;
    const vars = themeVars(theme) as Record<string, string>;
    const keys = ['--accent', '--accent-2', '--ink', '--bg', '--bg-2', '--glow'];
    keys.forEach((k) => (vars[k] ? root.style.setProperty(k, vars[k]) : root.style.removeProperty(k)));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme?.bg ?? '#0b0a14');
  }, [theme]);
}

export function PageBackground({ pattern }: { pattern?: string }) {
  return <div className="page-bg" data-pattern={pattern ?? 'none'} aria-hidden />;
}

// ---------------------------------------------------------------------------
// Elementi base
// ---------------------------------------------------------------------------
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'accent' | 'ghost' | 'soft' | 'danger'; size?: 'sm' | 'md'; loading?: boolean };

export function Button({ variant = 'soft', size = 'md', loading, className = '', children, disabled, ...rest }: BtnProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[.97] disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap';
  const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm' };
  const variants = {
    accent: 'btn-accent hover:brightness-110',
    soft: 'bg-ink/8 hover:bg-ink/14 text-ink border border-ink/10',
    ghost: 'text-ink/75 hover:text-ink hover:bg-ink/8',
    danger: 'bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 border border-rose-400/20',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function ProgressBar({ value, pending = 0, className = '' }: { value: number; pending?: number; className?: string }) {
  return (
    <div className={`relative h-2 overflow-hidden rounded-full bg-ink/10 ${className}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="absolute inset-y-0 left-0 rounded-full bg-amber-300/50" style={{ width: `${Math.min(100, value + pending)}%` }} />
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
        style={{ width: `${Math.min(100, value)}%`, background: 'linear-gradient(90deg, var(--accent-2), var(--accent))', boxShadow: '0 0 12px var(--glow)' }}
      />
    </div>
  );
}

export function ProgressRing({ value, size = 112, stroke = 9, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const id = useRef(`g${Math.random().toString(36).slice(2)}`).current;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent-2)" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, value) / 100)}
          style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)', filter: 'drop-shadow(0 0 6px var(--glow))' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'ok' | 'warn' | 'muted' | 'accent' }) {
  const tones = { ok: 'text-emerald-300', warn: 'text-amber-300', muted: 'text-ink/70', accent: 'text-accent' };
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink/50">{label}</div>
      <div className={`font-display text-xl font-semibold leading-tight sm:text-2xl ${tone ? tones[tone] : 'text-ink'}`}>{value}</div>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className = '' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[]; className?: string }) {
  return (
    <div className={`inline-flex shrink-0 rounded-full border border-ink/10 bg-ink/5 p-1 ${className}`} role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${active ? 'btn-accent' : 'text-ink/70 hover:text-ink'}`}
          >
            {o.label}
            {o.count != null && <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${active ? 'bg-black/15' : 'bg-ink/10'}`}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-10 appearance-none rounded-full border bg-ink/5 pl-4 pr-9 text-sm font-medium outline-none transition hover:bg-ink/10 ${value ? 'border-accent/60 text-accent' : 'border-ink/10 text-ink/80'}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-neutral-900 text-white">
            {o.label}
          </option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-3 size-4 text-ink/50" viewBox="0 0 20 20" fill="currentColor">
        <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </svg>
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="relative flex h-10 w-full min-w-0 shrink-0 items-center lg:w-auto lg:flex-1">
      <Search className="pointer-events-none absolute left-3.5 size-4 text-ink/50" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full w-full rounded-full border border-ink/10 bg-ink/5 pl-10 pr-9 text-sm outline-none transition placeholder:text-ink/40 focus:border-accent/60 focus:bg-ink/10 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-2 grid size-7 place-items-center rounded-full text-ink/60 hover:bg-ink/10" aria-label="Cancella ricerca">
          <X className="size-4" />
        </button>
      )}
    </label>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`size-6 animate-spin text-accent ${className}`} />;
}

export function FullPageLoader({ label = 'Caricamento…' }: { label?: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-3 text-ink/60">
        <Spinner className="size-8" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div className="panel mx-auto my-10 max-w-lg p-6 text-center">
      <div className="font-display text-lg font-semibold">Impossibile caricare i dati</div>
      <p className="mt-2 text-sm text-ink/60">{msg.includes('fetch') ? 'Connessione assente.' : msg}</p>
      {onRetry && (
        <Button className="mt-4" onClick={onRetry}>
          Riprova
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="panel mx-auto flex max-w-md flex-col items-center gap-2 px-6 py-12 text-center">
      {icon && <div className="mb-1 text-accent">{icon}</div>}
      <div className="font-display text-lg font-semibold">{title}</div>
      {text && <p className="text-sm text-ink/60">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast con azione (es. "Annulla")
// ---------------------------------------------------------------------------
interface Toast {
  id: number;
  text: string;
  tone?: 'ok' | 'error';
  action?: { label: string; run: () => void };
}
const ToastContext = createContext<(t: Omit<Toast, 'id'>) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), t.action ? 6000 : 3500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-in glass pointer-events-auto flex max-w-md items-center gap-3 rounded-full py-2 pl-5 pr-2 text-sm shadow-2xl ${t.tone === 'error' ? 'border-rose-400/40 text-rose-100' : ''}`}
          >
            <span className="py-1">{t.text}</span>
            {t.action && (
              <button
                className="rounded-full bg-ink/10 px-3 py-1 text-xs font-semibold hover:bg-ink/20"
                onClick={() => {
                  t.action!.run();
                  setToasts((all) => all.filter((x) => x.id !== t.id));
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
