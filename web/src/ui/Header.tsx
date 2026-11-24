import { ChevronRight, LogOut, Pause, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { useMotion } from './motion';

export interface Crumb {
  label: string;
  to?: string;
}

export function Header({ crumbs = [] }: { crumbs?: Crumb[] }) {
  const { user, demo, signOut } = useAuth();
  const { reduced, toggle } = useMotion();
  const navigate = useNavigate();

  return (
    <header className="glass sticky top-0 z-40 border-x-0 border-t-0">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:h-16 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Le mie collezioni">
          <img src="/favicon.svg" alt="" className="size-7" />
          <span className="hidden font-display text-lg font-semibold tracking-wide sm:inline">Collezioni</span>
        </Link>

        <nav className="scrollbar-none flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm" aria-label="Percorso">
          {crumbs.map((c, i) => (
            <span key={i} className="flex min-w-0 items-center gap-1">
              <ChevronRight className="size-4 shrink-0 text-ink/30" />
              {c.to ? (
                <Link to={c.to} className="truncate rounded-full px-2 py-1 text-ink/70 hover:bg-ink/10 hover:text-ink">
                  {c.label}
                </Link>
              ) : (
                <span className="truncate px-2 py-1 font-semibold text-ink">{c.label}</span>
              )}
            </span>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          {demo && <span className="hidden rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 sm:inline">DEMO</span>}
          <button
            onClick={toggle}
            className="flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-ink/70 hover:bg-ink/10 hover:text-ink"
            aria-pressed={reduced}
            title={reduced ? 'Attiva il movimento delle carte' : 'Riduci il movimento delle carte'}
          >
            {reduced ? <Sparkles className="size-4" /> : <Pause className="size-4" />}
            <span className="hidden md:inline">{reduced ? 'Attiva movimento' : 'Riduci movimento'}</span>
          </button>
          {user && !demo && (
            <button
              onClick={async () => {
                await signOut();
                navigate('/login');
              }}
              className="flex h-9 items-center gap-2 rounded-full px-3 text-xs text-ink/70 hover:bg-ink/10 hover:text-ink"
              title={`Esci (${user.email ?? ''})`}
            >
              <span className="hidden max-w-40 truncate lg:inline">{user.email}</span>
              <LogOut className="size-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
