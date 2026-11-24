import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { isDemo } from '../lib/repo';
import { supabase } from '../lib/supabase';
import { FullPageLoader } from '../ui/components';

interface AuthUser {
  id: string;
  email: string | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  demo: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const DEMO_USER: AuthUser = { id: 'demo', email: 'demo@locale' };

/** Traduce gli errori più comuni di Supabase Auth */
function message(err: { message: string } | null): string | null {
  if (!err) return null;
  const m = err.message.toLowerCase();
  if (m.includes('invalid login')) return 'Email o password non corretti.';
  if (m.includes('email not confirmed')) return 'Conferma prima la tua email (controlla la posta).';
  if (m.includes('already registered')) return 'Esiste già un account con questa email.';
  if (m.includes('password should be')) return 'La password deve avere almeno 6 caratteri.';
  if (m.includes('rate limit')) return 'Troppi tentativi, riprova tra qualche minuto.';
  if (m.includes('fetch')) return 'Connessione assente. Riprova.';
  return err.message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const demo = isDemo();
  const [user, setUser] = useState<AuthUser | null>(demo ? DEMO_USER : null);
  const [loading, setLoading] = useState(!demo);

  useEffect(() => {
    if (demo || !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) return;
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setUser(u ? { id: u.id, email: u.email ?? null } : null);
      setLoading(false);
    });
    const { data } = sb.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setUser(u ? { id: u.id, email: u.email ?? null } : null);
    });
    return () => data.subscription.unsubscribe();
  }, [demo]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      demo,
      signIn: async (email, password) => message((await supabase().auth.signInWithPassword({ email, password })).error),
      signUp: async (email, password) =>
        message((await supabase().auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })).error),
      resetPassword: async (email) =>
        message((await supabase().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })).error),
      signOut: async () => {
        if (!demo) await supabase().auth.signOut();
      },
    }),
    [user, loading, demo],
  );

  if (!demo && (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY)) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div className="panel max-w-md p-6">
          <div className="font-display text-xl font-semibold">Configurazione mancante</div>
          <p className="mt-2 text-sm text-ink/65">
            Imposta <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> (su Vercel: Settings → Environment Variables) e ripubblica.
          </p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuori da AuthProvider');
  return ctx;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}
