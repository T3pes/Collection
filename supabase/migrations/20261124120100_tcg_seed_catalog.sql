-- =====================================================================
-- Seed del catalogo: collezioni e set esistenti.
-- Stessi valori di catalog/collections.json (che resta la fonte per le
-- modifiche future: `npm run catalog:sync` li ri-sincronizza).
-- Idempotente: si può rieseguire.
-- =====================================================================

insert into public.tcg_collections
  (id, name, description, logo_url, card_back_url, theme, rarity_order, rarity_labels, version_order, market_search_url, sort)
values
(
  'naruto-mythos',
  'Naruto Mythos',
  'Trading Card Game ufficiale basato sul manga Naruto',
  'https://ekfwchaoknmsfpqocwsg.supabase.co/storage/v1/object/public/loghi/Naruto_TCG_Card_Back-0dcade80-640w.webp',
  'https://ekfwchaoknmsfpqocwsg.supabase.co/storage/v1/object/public/loghi/Naruto_TCG_Card_Back-0dcade80-640w.webp',
  '{"accent":"#ff7a1a","accent2":"#ffcf4a","ink":"#fff4ea","bg":"#140906","bg2":"#2a0f07","glow":"rgba(255,122,26,0.45)","pattern":"swirl","foilFrom":3,"sort":"rarity"}',
  '{C,UC,R,RA,S,SP,SV,POP,CHIBI,SHINOBI,M,MYTHOS,L,MISSION}',
  '{"C":"Comune","UC":"Non comune","R":"Rara","RA":"Rara alternativa","S":"Secret","SP":"Speciale","SV":"Secret numerata","POP":"Pop","CHIBI":"Chibi","SHINOBI":"Shinobi","M":"Mythos","MYTHOS":"Mythos","L":"Legendary","MISSION":"Missione"}',
  '{Normale,Full Art,Holo}',
  'https://www.ebay.it/sch/i.html?_nkw=Naruto+Mythos+{q}',
  10
),
(
  'pokemon-tcg',
  'Pokémon TCG',
  'Gioco di Carte Collezionabili Pokémon — espansioni in italiano',
  'https://ekfwchaoknmsfpqocwsg.supabase.co/storage/v1/object/public/loghi/Pokemon-01.png',
  null,
  '{"accent":"#ffcb05","accent2":"#3d7dca","ink":"#f4f7ff","bg":"#07102a","bg2":"#0f2357","glow":"rgba(255,203,5,0.40)","pattern":"rings","foilFrom":4,"sort":"number"}',
  '{Comune,Non comune,Rara,Rara doppia,Ultrarara,Rara illustrazione,Rara illustrazione speciale,Rara iper Mega,Mega Iper Raro}',
  '{}',
  '{Normale,Reverse,Holo}',
  'https://www.cardmarket.com/it/Pokemon/Products/Search?searchString={q}',
  20
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  logo_url = excluded.logo_url,
  card_back_url = excluded.card_back_url,
  theme = excluded.theme,
  rarity_order = excluded.rarity_order,
  rarity_labels = excluded.rarity_labels,
  version_order = excluded.version_order,
  market_search_url = excluded.market_search_url,
  sort = excluded.sort;

insert into public.tcg_sets
  (id, collection_id, name, subtitle, code, price_provider, price_config, legacy_table, sort)
values
  ('naruto-s1-1ed', 'naruto-mythos', 'Konoha Shidō', 'Set 1 · 1ª edizione', 'S1E1', 'manual', '{}', 'cards',            10),
  ('naruto-s1-2ed', 'naruto-mythos', 'Konoha Shidō', 'Set 1 · 2ª edizione', 'S1E2', 'manual', '{}', 'cards_2ed',        20),
  ('naruto-s2-1ed', 'naruto-mythos', 'Shinobi Shiren', 'Set 2 · 1ª edizione', 'S2E1', 'manual', '{}', 'Card_shiren',    30),
  ('pokemon-me02',  'pokemon-tcg',   'Fiamme Spettrali', 'Megaevoluzione', 'ME02', 'tcgdex', '{"setId":"me02","series":"me","lang":"it","syncRarity":true}', 'cards_pokemon_fs', 10),
  ('pokemon-me05',  'pokemon-tcg',   'Buio Pesto',       'Megaevoluzione', 'ME05', 'tcgdex', '{"setId":"me05","series":"me","lang":"it","syncRarity":true}', 'cards_pokemon_bp', 20)
on conflict (id) do update set
  collection_id = excluded.collection_id,
  name = excluded.name,
  subtitle = excluded.subtitle,
  code = excluded.code,
  price_provider = excluded.price_provider,
  price_config = excluded.price_config,
  legacy_table = excluded.legacy_table,
  sort = excluded.sort;
