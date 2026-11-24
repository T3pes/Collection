# Collezioni TCG — web app v2

Riscrittura della vecchia app in `temp-cra-app/` (che resta intatta finché non la elimini tu).

- **Vite + React 19 + TypeScript + Tailwind 4 + TanStack Query + Supabase**
- Carte animate "perspective card": fluttuano da sole, si inclinano seguendo il mouse con riflesso e bagliore olografico, si girano mostrando il retro (stesso principio della galleria GCC Pokémon 30°). Pulsante **Riduci movimento** in alto.
- **Tema per collezione** (colori, sfondo, ordinamento) definito in `catalog/collections.json`.
- Versioni della stessa carta (Normale / Full Art / Holo / Reverse) raggruppate in un'unica tessera, con un chip per versione.
- Ricerca per nome o numero, filtri rarità/versione, ordinamento per numero/rarità/prezzo.
- Lista acquisti con selezione multipla → "In arrivo" → "Arrivate", export CSV / Excel / lista numerica / copia negli appunti.
- Dettaglio carta: stato per versione, numero di copie (doppie), prezzo di mercato e prezzo personale, link di ricerca su Cardmarket/eBay, navigazione ← →.
- **Prezzi**: Pokémon automatici da Cardmarket via [TCGdex](https://tcgdex.dev) (gratis, senza chiave); Naruto (nessun listino pubblico) con prezzo inserito da te.
- Valore della collezione e costo per completarla, per set e per collezione.
- I vecchi link `/collection/...` reindirizzano ai nuovi.

## Provarla subito (modalità demo)

```bash
cd web
npm install
npm run dev
```

Senza `.env` parte in **modalità demo**: tutte le 1.680 carte dei tuoi CSV, prezzi Cardmarket reali di Fiamme Spettrali al 24/11/2026, salvataggio nel browser.

## Passaggio ai dati reali

### 1. Database (Supabase → SQL Editor), in quest'ordine

1. `supabase/migrations/20261124120000_tcg_unified_schema.sql` — nuove tabelle `tcg_*` con RLS
2. `supabase/migrations/20261124120100_tcg_seed_catalog.sql` — collezioni e set
3. `supabase/migrations/20261124120200_tcg_migrate_legacy.sql` — copia carte, possedute e "in attesa" dalle tabelle vecchie (che **non vengono toccate**). Alla fine mostra un riepilogo per set: controlla che i numeri tornino.

Gli script si possono rieseguire senza creare doppioni.

### 2. Funzione prezzi

```bash
npx supabase login
npx supabase functions deploy refresh-prices --project-ref <PROJECT_REF>
```

(oppure Dashboard → Edge Functions → *Deploy a new function* → incolla `supabase/functions/refresh-prices/index.ts`).
Poi nell'app apri un set Pokémon e premi **Aggiorna prezzi**: scarica i prezzi, sostituisce le immagini segnaposto con quelle ufficiali italiane e corregge le rarità (Rara doppia, Ultrarara…).
Facoltativo: `supabase/cron_refresh_prices.sql` per aggiornarli ogni notte.

### 3. Variabili d'ambiente

`web/.env` (in locale) e su Vercel:

```
VITE_SUPABASE_URL=https://ekfwchaoknmsfpqocwsg.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Attenzione: i nomi cambiano rispetto alla vecchia app (`REACT_APP_…` → `VITE_…`).

### 4. Vercel

Project → Settings → General → **Root Directory = `web`** (usa `web/vercel.json`), aggiungi le due variabili e ridistribuisci.
Il `vercel.json` nella radice del repository serve ancora alla vecchia app: finché non cambi la Root Directory, la produzione resta quella attuale.

## Aggiungere collezioni e set

Vedi **[`catalog/README.md`](catalog/README.md)**: si modifica solo `catalog/collections.json` (+ un CSV, oppure import automatico da TCGdex per i Pokémon) e si lancia `npm run catalog:sync`. Nessuna modifica al codice.

## Struttura

```
web/
  catalog/collections.json   collezioni, set, temi, rarità, fonte prezzi
  catalog/cards/*.csv        carte dei set manuali (facoltativo)
  scripts/sync-catalog.mjs   pubblica il catalogo su Supabase
  scripts/build-demo-fixture.py  rigenera i dati demo dai CSV in Base/
  src/lib/                   tipi, accesso dati (Supabase / demo), query, export
  src/ui/motion.tsx          motore delle carte animate (un solo requestAnimationFrame)
  src/ui/PerspectiveCard.tsx carta 3D con riflesso, foil e retro
  src/pages/                 Home, Collezione, Set (galleria, acquisti, in arrivo), Login
supabase/
  migrations/                schema, seed, migrazione dati
  functions/refresh-prices/  Edge Function prezzi (TCGdex → Cardmarket EUR)
```

## Schema dati

| tabella | contenuto |
|---|---|
| `tcg_collections` | collezioni con tema, ordine rarità, etichette, link mercato |
| `tcg_sets` | set di ogni collezione, fonte prezzi (`manual` / `tcgdex`) |
| `tcg_cards` | una riga per **versione** di carta (stesso numero ripetuto per Normale/Full Art/Holo) |
| `tcg_user_cards` | stato utente per carta: `owned` / `pending`, quantità, note |
| `tcg_card_prices` / `_history` | prezzo di mercato attuale e storico giornaliero |
| `tcg_user_prices` | prezzo personale (override o unico prezzo per i set manuali) |

`tcg_set_progress()` restituisce in una query totale, possedute, in arrivo, valore posseduto e costo dei mancanti per ogni set.
