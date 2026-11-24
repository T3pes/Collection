import { useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { Button, PageBackground, useDocumentTheme } from '../ui/components';
import { PerspectiveCard } from '../ui/PerspectiveCard';

type Mode = 'login' | 'signup' | 'reset';

const DECOR = [
  { rot: -16, x: '-62%', y: '6%', accent: '#ff7a1a' },
  { rot: 0, x: '0%', y: '-4%', accent: '#a78bfa' },
  { rot: 16, x: '62%', y: '6%', accent: '#ffcb05' },
];

export default function LoginPage() {
  useDocumentTheme(null);
  const { user, signIn, signUp, resetPassword } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (user) return <Navigate to={from} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const err = mode === 'login' ? await signIn(email, password) : mode === 'signup' ? await signUp(email, password) : await resetPassword(email);
    setBusy(false);
    if (err) setError(err);
    else if (mode === 'signup') setInfo('Registrazione completata! Controlla la mail per confermare l’account.');
    else if (mode === 'reset') setInfo('Ti abbiamo inviato un link per reimpostare la password.');
  };

  return (
    <>
      <PageBackground />
      <main className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-2">
        <div className="relative hidden aspect-[4/3] lg:block" aria-hidden>
          {DECOR.map((d, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 w-[34%]"
              style={{ transform: `translate(calc(-50% + ${d.x}), calc(-50% + ${d.y})) rotate(${d.rot}deg)`, zIndex: i === 1 ? 3 : 1, ['--accent' as string]: d.accent }}
            >
              <PerspectiveCard image={null} alt={['Naruto', 'Le tue carte', 'Pokémon'][i]} foil intensity={6} />
            </div>
          ))}
        </div>

        <div className="mx-auto w-full max-w-md">
          <img src="/favicon.svg" alt="" className="mb-6 size-12" />
          <h1 className="text-gradient font-display text-5xl font-bold italic leading-none tracking-tight">Collezioni TCG</h1>
          <p className="mt-3 text-ink/65">Tieni traccia delle tue carte, di quelle che mancano e di quanto vale la tua collezione.</p>

          <form onSubmit={submit} className="panel glass mt-8 flex flex-col gap-3 p-6">
            <div className="mb-1 font-display text-xl font-semibold">{mode === 'login' ? 'Accedi' : mode === 'signup' ? 'Crea un account' : 'Recupera password'}</div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink/60">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl border border-ink/15 bg-ink/5 px-4 outline-none focus:border-accent/70"
              />
            </label>
            {mode !== 'reset' && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-ink/60">Password</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl border border-ink/15 bg-ink/5 px-4 outline-none focus:border-accent/70"
                />
              </label>
            )}
            {error && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</div>}
            {info && <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{info}</div>}
            <Button type="submit" variant="accent" loading={busy} className="mt-2 h-11">
              {mode === 'login' ? 'Entra' : mode === 'signup' ? 'Registrati' : 'Invia link'}
            </Button>
            <div className="mt-1 flex flex-wrap justify-between gap-2 text-sm">
              <button type="button" className="text-ink/60 hover:text-accent" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                {mode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
              </button>
              {mode === 'login' && (
                <button type="button" className="text-ink/45 hover:text-accent" onClick={() => setMode('reset')}>
                  Password dimenticata?
                </button>
              )}
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
