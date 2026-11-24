-- =====================================================================
-- TCG Collection — schema unificato
-- ---------------------------------------------------------------------
-- Crea le nuove tabelle (prefisso tcg_) affiancandole a quelle esistenti.
-- NON modifica né cancella cards, cards_2ed, Card_shiren, cards_pokemon_*,
-- user_cards*, pending_cards: la vecchia app continua a funzionare finché
-- non passi alla nuova.
--
-- Esegui questo file nel SQL Editor di Supabase, poi
--   20261124120100_tcg_seed_catalog.sql
--   20261124120200_tcg_migrate_legacy.sql
-- =====================================================================


-- ---------------------------------------------------------------------
-- Collezioni (es. Naruto Mythos, Pokémon TCG)
-- ---------------------------------------------------------------------
create table if not exists public.tcg_collections (
  id              text primary key check (id ~ '^[a-z0-9][a-z0-9-]*$'),
  name            text not null,
  description     text,
  logo_url        text,
  cover_url       text,
  card_back_url   text,
  -- colori e stile della collezione (vedi catalog/collections.json)
  theme           jsonb not null default '{}'::jsonb,
  -- ordine rarità (codici così come salvati in tcg_cards.rarity, case-insensitive)
  rarity_order    text[] not null default '{}',
  -- etichette leggibili per i codici rarità: {"UC": "Non comune"}
  rarity_labels   jsonb not null default '{}'::jsonb,
  -- ordine delle finiture: Normale, Full Art, Holo, Reverse ...
  version_order   text[] not null default '{Normale,Reverse,Full Art,Holo}',
  -- link di ricerca sul mercato, {q} viene sostituito con nome + numero
  market_search_url text,
  sort            int not null default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Set / espansioni / edizioni
-- ---------------------------------------------------------------------
create table if not exists public.tcg_sets (
  id              text primary key check (id ~ '^[a-z0-9][a-z0-9-]*$'),
  collection_id   text not null references public.tcg_collections(id) on delete cascade,
  name            text not null,
  subtitle        text,
  code            text,
  release_date    date,
  logo_url        text,
  card_back_url   text,
  rarity_order    text[],          -- override facoltativo della collezione
  -- fonte prezzi: 'manual' (solo prezzi inseriti dall'utente) | 'tcgdex'
  price_provider  text not null default 'manual' check (price_provider in ('manual', 'tcgdex')),
  -- es. {"setId": "me02", "lang": "it"} per tcgdex
  price_config    jsonb not null default '{}'::jsonb,
  -- tabella della vecchia app da cui sono state migrate le carte
  legacy_table    text,
  sort            int not null default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists tcg_sets_collection_idx on public.tcg_sets(collection_id, sort);

-- ---------------------------------------------------------------------
-- Carte (una riga per ogni variante collezionabile)
-- ---------------------------------------------------------------------
create table if not exists public.tcg_cards (
  id              uuid primary key default gen_random_uuid(),
  set_id          text not null references public.tcg_sets(id) on delete cascade,
  number          int not null,
  number_label    text,            -- es. "001/094" o "M4"; se null si usa number
  name            text not null,
  subtitle        text,
  rarity          text,
  rarity_rank     int,
  version         text not null default 'Normale',
  variant         text,            -- es. "Set standard olografico"
  type            text,
  image_url       text,
  external_id     text,            -- id sulla fonte prezzi (es. "me02-001")
  sort            int not null default 0,
  extra           jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists tcg_cards_set_idx on public.tcg_cards(set_id, rarity_rank, number);
-- Nessun vincolo di unicità su numero/nome: esistono promo distinte con
-- stesso numero, nome e rarità ma illustrazione diversa. L'identità è l'UUID.
create index if not exists tcg_cards_external_idx on public.tcg_cards(set_id, external_id);

-- ---------------------------------------------------------------------
-- Collezione dell'utente: possedute + in attesa di arrivo
-- ---------------------------------------------------------------------
create table if not exists public.tcg_user_cards (
  user_id         uuid not null references auth.users(id) on delete cascade,
  card_id         uuid not null references public.tcg_cards(id) on delete cascade,
  status          text not null default 'owned' check (status in ('owned', 'pending')),
  quantity        int not null default 1 check (quantity >= 1),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (user_id, card_id)
);
create index if not exists tcg_user_cards_card_idx on public.tcg_user_cards(card_id);

-- ---------------------------------------------------------------------
-- Prezzi di mercato (scritti dalla Edge Function refresh-prices)
-- ---------------------------------------------------------------------
create table if not exists public.tcg_card_prices (
  card_id         uuid primary key references public.tcg_cards(id) on delete cascade,
  source          text not null,             -- 'cardmarket' ...
  currency        text not null default 'EUR',
  price           numeric(12, 2),            -- valore di riferimento (trend)
  price_low       numeric(12, 2),
  price_avg30     numeric(12, 2),
  url             text,
  raw             jsonb,
  updated_at      timestamptz not null default now()
);

create table if not exists public.tcg_card_price_history (
  card_id         uuid not null references public.tcg_cards(id) on delete cascade,
  day             date not null default current_date,
  source          text not null,
  price           numeric(12, 2),
  primary key (card_id, day, source)
);

-- Prezzo personale dell'utente (override o unico prezzo per i set 'manual')
create table if not exists public.tcg_user_prices (
  user_id         uuid not null references auth.users(id) on delete cascade,
  card_id         uuid not null references public.tcg_cards(id) on delete cascade,
  price           numeric(12, 2) not null check (price >= 0),
  updated_at      timestamptz not null default now(),
  primary key (user_id, card_id)
);

-- ---------------------------------------------------------------------
-- updated_at automatico
-- ---------------------------------------------------------------------
create or replace function public.tcg_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tcg_cards_touch on public.tcg_cards;
create trigger tcg_cards_touch before update on public.tcg_cards
  for each row execute function public.tcg_touch_updated_at();

drop trigger if exists tcg_user_cards_touch on public.tcg_user_cards;
create trigger tcg_user_cards_touch before update on public.tcg_user_cards
  for each row execute function public.tcg_touch_updated_at();

drop trigger if exists tcg_user_prices_touch on public.tcg_user_prices;
create trigger tcg_user_prices_touch before update on public.tcg_user_prices
  for each row execute function public.tcg_touch_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.tcg_collections        enable row level security;
alter table public.tcg_sets               enable row level security;
alter table public.tcg_cards              enable row level security;
alter table public.tcg_user_cards         enable row level security;
alter table public.tcg_card_prices        enable row level security;
alter table public.tcg_card_price_history enable row level security;
alter table public.tcg_user_prices        enable row level security;

-- Permessi espliciti (non dipendono dalle impostazioni di default del progetto)
grant select on public.tcg_collections, public.tcg_sets, public.tcg_cards,
                public.tcg_card_prices, public.tcg_card_price_history to authenticated;
grant select, insert, update, delete on public.tcg_user_cards, public.tcg_user_prices to authenticated;
grant all on public.tcg_collections, public.tcg_sets, public.tcg_cards, public.tcg_card_prices,
             public.tcg_card_price_history, public.tcg_user_cards, public.tcg_user_prices to service_role;

-- Catalogo e prezzi: lettura per utenti autenticati, scrittura solo service role
drop policy if exists "tcg_collections read" on public.tcg_collections;
create policy "tcg_collections read" on public.tcg_collections for select to authenticated using (true);

drop policy if exists "tcg_sets read" on public.tcg_sets;
create policy "tcg_sets read" on public.tcg_sets for select to authenticated using (true);

drop policy if exists "tcg_cards read" on public.tcg_cards;
create policy "tcg_cards read" on public.tcg_cards for select to authenticated using (true);

drop policy if exists "tcg_card_prices read" on public.tcg_card_prices;
create policy "tcg_card_prices read" on public.tcg_card_prices for select to authenticated using (true);

drop policy if exists "tcg_card_price_history read" on public.tcg_card_price_history;
create policy "tcg_card_price_history read" on public.tcg_card_price_history for select to authenticated using (true);

-- Dati utente: ognuno vede e modifica solo i propri
drop policy if exists "tcg_user_cards own" on public.tcg_user_cards;
create policy "tcg_user_cards own" on public.tcg_user_cards for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "tcg_user_prices own" on public.tcg_user_prices;
create policy "tcg_user_prices own" on public.tcg_user_prices for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- Statistiche per set dell'utente corrente (una sola query per la home)
-- ---------------------------------------------------------------------
create or replace function public.tcg_set_progress()
returns table (
  set_id        text,
  total         int,
  owned         int,
  pending       int,
  owned_value   numeric,
  missing_value numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.set_id,
    count(*)::int,
    count(*) filter (where uc.status = 'owned')::int,
    count(*) filter (where uc.status = 'pending')::int,
    coalesce(sum(coalesce(up.price, p.price) * uc.quantity) filter (where uc.status = 'owned'), 0),
    coalesce(sum(coalesce(up.price, p.price)) filter (where uc.status is distinct from 'owned'), 0)
  from public.tcg_cards c
  left join public.tcg_user_cards uc on uc.card_id = c.id and uc.user_id = (select auth.uid())
  left join public.tcg_card_prices p on p.card_id = c.id
  left join public.tcg_user_prices up on up.card_id = c.id and up.user_id = (select auth.uid())
  group by c.set_id;
$$;

grant execute on function public.tcg_set_progress() to authenticated;
