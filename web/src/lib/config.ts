/**
 * Configurazione pubblica di Supabase.
 * URL e chiave "publishable" sono pensati per stare nel browser: i dati sono
 * protetti dalle policy RLS. Le variabili VITE_* (se presenti) hanno la precedenza.
 * Non mettere mai qui la chiave segreta (service_role / sb_secret_…).
 */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || 'https://ekfwchaoknmsfpqocwsg.supabase.co';
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_R98hVITSGNPgGoxGrhqzjw_Nhfr2IY2';
