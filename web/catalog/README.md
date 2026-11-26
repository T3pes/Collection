# Aggiungere una collezione o un set

Tutto il catalogo (collezioni, set, colori, rarità, fonte prezzi) sta in **`collections.json`**.
L'app non ha nulla di "cablato": legge collezioni e set dal database, quindi **non serve toccare il codice**.

## 1 · Nuovo set Pokémon (automatico)

1. In `collections.json`, dentro `pokemon-tcg` → `sets`, aggiungi:

   ```json
   { "id": "pokemon-me06", "name": "Dominio Delta", "subtitle": "Megaevoluzione", "code": "ME06",
     "price_provider": "tcgdex",
     "price_config": { "setId": "me06", "series": "me", "lang": "it", "syncRarity": true },
     "sort": 30 }
   ```

   L'id TCGdex del set (`me06`) si trova su <https://api.tcgdex.net/v2/it/series/me>.

2. `npm run catalog:sync -- --set pokemon-me06 --tcgdex`
   → importa tutte le carte (nome, numero, rarità, immagine ufficiale italiana, versioni Normale/Reverse).
3. Nell'app apri il set e premi **Aggiorna prezzi** (oppure aspetta l'aggiornamento notturno).

## 2 · Nuovo set da CSV (Naruto o qualsiasi gioco)

1. Aggiungi il set in `collections.json` (con `"price_provider": "manual"` se non c'è un listino automatico).
2. Crea `cards/<id-set>.csv` con queste colonne (vedi `cards/_esempio.csv`):

   | colonna | obbligatoria | note |
   |---|---|---|
   | `number` | sì | numero della carta (1, 2, 3…) |
   | `name` | sì | |
   | `subtitle` | | es. citazione o titolo della carta |
   | `rarity` | | codice come in `rarity_order` (C, UC, R…) |
   | `version` | | `Normale`, `Full Art`, `Holo`, `Reverse` — **una riga per versione**: stesso numero ripetuto 3 volte per Normale/Full Art/Holo |
   | `variant`, `type`, `image_url` | | |
   | `card_id` | | UUID fisso; se manca viene generato in modo stabile |

3. `npm run catalog:sync -- --set <id-set>`

Rilanciare lo script aggiorna le righe esistenti (stesso UUID), non crea doppioni.

## 3 · Nuova collezione (nuovo gioco)

Aggiungi un oggetto in `collections` con:

- `theme`: colori della collezione (`accent`, `accent2`, `bg`, `bg2`, `ink`, `glow`), `pattern` dello sfondo (`swirl`, `rings`, `none`),
  `foilFrom` (da quale rarità le carte hanno l'effetto olografico), `sort` (ordine predefinito: `number`, `rarity`, `rare`, `price`);
- `rarity_order` (dalla più comune alla più rara) e `rarity_labels` (nomi leggibili dei codici);
- `version_order` (ordine dei chip versione);
- `market_search_url` con `{q}` (es. ricerca Cardmarket o eBay);
- `card_back_url` (retro mostrato quando giri la carta).

Poi aggiungi i set come sopra e lancia `npm run catalog:sync`.

## 4 · Colori di un singolo set

Ogni set può avere un suo `theme` (stesse chiavi della collezione: `accent`, `accent2`, `bg`, `bg2`, `ink`, `glow`, `pattern`).
Vale solo per le chiavi indicate; il resto viene dalla collezione. Per i Pokémon i colori si prendono dalla galleria
ufficiale del set (`https://tcg.pokemon.com/it-it/galleries/<nome-set>/`, foglio di stile `<nome-set>.css`).
Esempio (Fiamme Spettrali):

```json
"theme": { "accent": "#FF9C33", "accent2": "#45B1DB", "bg": "#03051A", "bg2": "#101A6E", "glow": "rgba(255,136,99,0.45)", "pattern": "stars" }
```

> Lo script usa `SUPABASE_SERVICE_ROLE_KEY` da `web/.env`: tienila solo sul tuo PC, non metterla su Vercel né su Git.

## 5. Prezzi Naruto Mythos (narutocardcollector.com)

Per Naruto non esiste un listino come Cardmarket: i prezzi sono la **mediana delle vendite eBay concluse**
raccolte (a mano) da [narutocardcollector.com](https://narutocardcollector.com), usate con il consenso del gestore
e citate nell'app con il link alla carta.

```bash
cd web
node scripts/naruto-prices.mjs      # ~20 min, 1 richiesta al secondo; riprende da dove si era fermato
```

Genera `scripts/out/naruto-prices.sql`: eseguilo nel SQL Editor di Supabase (aggiorna solo le carte abbinate in modo univoco
e mostra le carte ambigue o senza corrispondenza). Il gestore inserisce le vendite con qualche giorno di ritardo,
quindi basta rilanciarlo ogni tanto (es. una volta a settimana o al mese), non ogni giorno.
