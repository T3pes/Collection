-- =====================================================================
-- Copia i dati dalle tabelle della vecchia app allo schema tcg_*.
--
-- * Le tabelle vecchie NON vengono modificate.
-- * Gli UUID delle carte restano gli stessi (serial_id per Naruto,
--   card_id per Pokémon), quindi possedute e "in attesa" si collegano 1:1.
-- * Idempotente: rieseguirlo non crea duplicati (on conflict do nothing).
-- * Alla fine stampa un riepilogo (NOTICE) con i conteggi per tabella.
-- =====================================================================

do $$
declare
  s            record;
  user_table   text;
  rarity_up    text[];
  tcg_set      text;
  tcg_series   text;
  n_cards      int;
  n_user       int;
  n_pending    int;
  uuid_re      constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  user_tables  constant jsonb := '{
    "cards":            "user_cards",
    "cards_2ed":        "user_cards_2ed",
    "Card_shiren":      "user_cards_shiren",
    "cards_pokemon_fs": "user_cards_pokemon_fs",
    "cards_pokemon_bp": "user_cards_pokemon_bp"
  }';
begin
  for s in
    select st.*, coalesce(st.rarity_order, c.rarity_order) as eff_rarity_order
    from public.tcg_sets st
    join public.tcg_collections c on c.id = st.collection_id
    where st.legacy_table is not null
  loop
    if to_regclass(format('public.%I', s.legacy_table)) is null then
      raise notice 'Set %: tabella % non trovata, salto', s.id, s.legacy_table;
      continue;
    end if;

    select coalesce(array_agg(upper(x) order by i), '{}') into rarity_up
    from unnest(s.eff_rarity_order) with ordinality as t(x, i);

    tcg_set    := s.price_config ->> 'setId';
    tcg_series := coalesce(s.price_config ->> 'series', 'me');

    -- ---------------- carte ----------------
    execute format($q$
      with src as (
        select to_jsonb(t) as j from public.%I t
      ), norm as (
        select
          coalesce(nullif(j->>'card_id', ''), nullif(j->>'serial_id', '')) as legacy_id,
          nullif(regexp_replace(coalesce(j->>'id', ''), '\D', '', 'g'), '')::int as num,
          trim(coalesce(j->>'name', '')) as name,
          nullif(trim(j->>'rarity'), '') as rarity,
          nullif(trim(j->>'version'), '') as raw_version,
          nullif(trim(j->>'set_variant'), '') as variant,
          nullif(trim(j->>'type'), '') as type,
          nullif(trim(j->>'image_url'), '') as image_url
        from src
      )
      insert into public.tcg_cards
        (id, set_id, number, name, subtitle, rarity, rarity_rank, version, variant, type, image_url, external_id, extra)
      select
        legacy_id::uuid,
        $1,
        num,
        name,
        case when lower(coalesce(raw_version, '')) in ('', 'normale', 'normal', 'full art', 'fullart', 'holo', 'reverse')
             then null else raw_version end,
        rarity,
        coalesce(array_position($2, upper(rarity)), 99),
        case lower(coalesce(raw_version, ''))
          when 'full art' then 'Full Art'
          when 'fullart'  then 'Full Art'
          when 'holo'     then 'Holo'
          when 'reverse'  then 'Reverse'
          else 'Normale'
        end,
        variant,
        type,
        case
          when $3 is not null and (image_url is null or image_url ilike '%%pokemon-01.png' or image_url ilike '%%pokemon-logo.png')
            then format('https://assets.tcgdex.net/it/%%s/%%s/%%s/high.webp', $4, $3, lpad(num::text, 3, '0'))
          else image_url
        end,
        case when $3 is not null then $3 || '-' || lpad(num::text, 3, '0') end,
        jsonb_build_object('legacy_table', %L)
      from norm
      where legacy_id ~* %L and num is not null and name <> ''
      on conflict do nothing
    $q$, s.legacy_table, s.legacy_table, uuid_re)
    using s.id, rarity_up, tcg_set, tcg_series;
    get diagnostics n_cards = row_count;

    -- ---------------- possedute ----------------
    n_user := 0;
    user_table := user_tables ->> s.legacy_table;
    if user_table is not null and to_regclass(format('public.%I', user_table)) is not null then
      execute format($q$
        with src as (
          select to_jsonb(t) as j from public.%I t
        )
        insert into public.tcg_user_cards (user_id, card_id, status, quantity)
        select distinct on (u_id, c_id) u_id, c_id, 'owned', 1
        from (
          select (j->>'user_id')::uuid as u_id,
                 coalesce(nullif(j->>'card_uuid', ''), nullif(j->>'card_id', ''))::uuid as c_id
          from src
          where coalesce(nullif(j->>'card_uuid', ''), nullif(j->>'card_id', '')) ~* %L
            and j->>'user_id' is not null
        ) x
        where exists (select 1 from public.tcg_cards c where c.id = x.c_id)
          and exists (select 1 from auth.users u where u.id = x.u_id)
        on conflict (user_id, card_id) do nothing
      $q$, user_table, uuid_re);
      get diagnostics n_user = row_count;
    end if;

    raise notice 'Set % (%): % carte, % possedute copiate', s.id, s.legacy_table, n_cards, n_user;
  end loop;

  -- ---------------- in attesa di arrivo ----------------
  if to_regclass('public.pending_cards') is not null then
    insert into public.tcg_user_cards (user_id, card_id, status, quantity)
    select distinct p.user_id, p.cid, 'pending', 1
    from (
      select (j->>'user_id')::uuid as user_id,
             (case when j->>'card_uuid' ~* uuid_re then j->>'card_uuid' else j->>'card_id' end)::uuid as cid
      from (select to_jsonb(t) as j from public.pending_cards t) s
      where coalesce(j->>'card_uuid', '') ~* uuid_re or coalesce(j->>'card_id', '') ~* uuid_re
    ) p
    where exists (select 1 from public.tcg_cards c where c.id = p.cid)
    on conflict (user_id, card_id) do nothing;   -- se già posseduta, resta posseduta
    get diagnostics n_pending = row_count;
    raise notice 'In attesa di arrivo copiate: %', n_pending;
  end if;
end;
$$;

-- Riepilogo finale
select s.id as set_id,
       s.legacy_table,
       (select count(*) from public.tcg_cards c where c.set_id = s.id) as carte,
       (select count(*) from public.tcg_user_cards uc join public.tcg_cards c on c.id = uc.card_id
          where c.set_id = s.id and uc.status = 'owned') as possedute,
       (select count(*) from public.tcg_user_cards uc join public.tcg_cards c on c.id = uc.card_id
          where c.set_id = s.id and uc.status = 'pending') as in_attesa
from public.tcg_sets s
order by s.collection_id, s.sort;
