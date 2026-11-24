-- =====================================================================
-- Nuovo set Pokémon: Collezione Classica del 30° (30C, TCGdex 30th-c, uscita 16/09/2026)
-- 30 carte holo (ristampe classiche). Prezzi da TCGdex/Cardmarket; immagini dalla
-- galleria ufficiale tcg.pokemon.com (TCGdex non le fornisce). Idempotente.
-- =====================================================================

update public.tcg_collections set rarity_order = '{Comune,Non comune,Rara,Rara doppia,Ultrarara,Rara illustrazione,Pikachu Rare,Rara illustrazione speciale,Futuristic Rare,RGB Rare,Rara iper Mega,Mega Iper Raro,Collezione Classica}' where id = 'pokemon-tcg';

insert into public.tcg_sets (id, collection_id, name, subtitle, code, release_date, price_provider, price_config, theme, sort)
values ('pokemon-30th-c', 'pokemon-tcg', 'Collezione Classica del 30°', 'Megaevoluzione', '30C', '2026-09-16', 'tcgdex',
        '{"setId": "30th-c", "series": "me", "lang": "it", "syncRarity": false}', '{"accent": "#8AE0FE", "accent2": "#F9DB30", "ink": "#F2FBFF", "bg": "#03101F", "bg2": "#2571CA", "glow": "rgba(138,224,254,0.40)", "pattern": "stars"}', 31)
on conflict (id) do update set
  name = excluded.name, subtitle = excluded.subtitle, code = excluded.code, release_date = excluded.release_date,
  price_provider = excluded.price_provider, price_config = excluded.price_config, theme = excluded.theme, sort = excluded.sort;

insert into public.tcg_cards (id, set_id, number, name, rarity, rarity_rank, version, type, image_url, external_id)
values
  ('b0c7226a-d738-5f9f-a43f-9e0686f4ca95', 'pokemon-30th-c', 1, 'Charizard', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_1.png', '30th-c-001'),
  ('62717c7d-bc57-5be5-b1c4-ee9488771593', 'pokemon-30th-c', 2, 'Delcatty', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_2.png', '30th-c-002'),
  ('19a75c23-404a-5e12-8528-1e1bd7bf3e06', 'pokemon-30th-c', 3, 'Metagross', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_3.png', '30th-c-003'),
  ('4f364424-043f-5ae9-8011-6825d2b90bc6', 'pokemon-30th-c', 4, 'Genesect EX', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_4.png', '30th-c-004'),
  ('5368a9c4-0db6-5125-b9b7-d3855efe512d', 'pokemon-30th-c', 5, 'Misty', 'Collezione Classica', 13, 'Holo', 'Allenatore', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_5.png', '30th-c-005'),
  ('f1a778de-047a-5469-a15b-828486a37816', 'pokemon-30th-c', 6, 'Dark Tyranitar', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_6.png', '30th-c-006'),
  ('c9b2e308-5932-5800-943c-15f5e415ca45', 'pokemon-30th-c', 7, 'Sneasel', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_7.png', '30th-c-007'),
  ('4517f2e3-03e5-598e-b1a1-6843952fa268', 'pokemon-30th-c', 8, 'Pikachu e Zekrom GX', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_8.png', '30th-c-008'),
  ('be72a341-91e8-5b6b-b841-a1d41be9ba5b', 'pokemon-30th-c', 9, 'Greninja TURBO', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_9.png', '30th-c-009'),
  ('1347f409-cae4-5cbc-b650-10c22e172b83', 'pokemon-30th-c', 10, 'Uxie', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_10.png', '30th-c-010'),
  ('85813869-0892-5b4c-b5fa-b67023b8b8c6', 'pokemon-30th-c', 11, 'Crobat G', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_11.png', '30th-c-011'),
  ('6d204b5b-4052-54f0-8223-23c5123246c9', 'pokemon-30th-c', 12, 'Raikou', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_12.png', '30th-c-012'),
  ('0e353ed6-dc12-56cc-b8cc-6cffd0f332fd', 'pokemon-30th-c', 13, 'Buzzwole GX', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_13.png', '30th-c-013'),
  ('8f15ef63-3aeb-5c98-a571-9fdc89e72d88', 'pokemon-30th-c', 14, 'Pikachu', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_14.png', '30th-c-014'),
  ('1117df1f-f4cf-5693-9054-bdd30c9966d4', 'pokemon-30th-c', 15, 'Jigglypuff di Erika', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_15.png', '30th-c-015'),
  ('a842a114-5335-5952-a21c-6a63df6a2fb6', 'pokemon-30th-c', 16, 'Rayquaza EX', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_16.png', '30th-c-016'),
  ('08399da9-942a-5e53-b8a2-ef5ff8a8a077', 'pokemon-30th-c', 17, 'Solgaleo GX', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_17.png', '30th-c-017'),
  ('18753af4-1029-5ac4-af63-ef682c29f980', 'pokemon-30th-c', 18, 'Gengar', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_18.png', '30th-c-018'),
  ('7822dbde-e5be-5b1a-b31b-d2aef3e92466', 'pokemon-30th-c', 19, 'Darkrai & Cresselia LEGGENDA', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_19.png', '30th-c-019'),
  ('31903c01-7f68-5c62-b323-2c890d6625e8', 'pokemon-30th-c', 20, 'Darkrai & Cresselia LEGGENDA', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_20.png', '30th-c-020'),
  ('eb73f5e4-081b-5126-85ba-296235e5b29b', 'pokemon-30th-c', 21, 'N', 'Collezione Classica', 13, 'Holo', 'Allenatore', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_21.png', '30th-c-021'),
  ('d3cf3fd9-0fd3-523e-94a4-6ef2461fa75d', 'pokemon-30th-c', 22, 'Palkia', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_22.png', '30th-c-022'),
  ('f7a2d937-9fe2-51ef-b07d-6a1e0fd6b779', 'pokemon-30th-c', 23, 'M Gardevoir EX', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_23.png', '30th-c-023'),
  ('8c571e52-a351-5474-85a2-a1c2d0479203', 'pokemon-30th-c', 24, 'Shining Celebi', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_24.png', '30th-c-024'),
  ('15ea05b4-5d38-50dd-a92f-9dcc42af4b19', 'pokemon-30th-c', 25, 'Scizor ex', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_25.png', '30th-c-025'),
  ('05327fd4-a5c6-50ee-944f-4c3b603511b1', 'pokemon-30th-c', 26, 'Mew-VMAX', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_26.png', '30th-c-026'),
  ('bdfdc9f5-1fe1-5afe-81d9-629c7294c099', 'pokemon-30th-c', 27, 'Arceus-V ASTRO', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_27.png', '30th-c-027'),
  ('c2d7812f-cb05-5590-927a-49073b55bda9', 'pokemon-30th-c', 28, 'Zacian-V', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_28.png', '30th-c-028'),
  ('7b9a4cff-2f1c-5e35-9e91-10f857ec84de', 'pokemon-30th-c', 29, 'Lugia', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_29.png', '30th-c-029'),
  ('c18ba20c-9cb7-5740-af74-11ddac52bbf6', 'pokemon-30th-c', 30, 'Magikarp', 'Collezione Classica', 13, 'Holo', 'Pokémon', 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/it-it/2M6P_Classic_IT_30.png', '30th-c-030')
on conflict (id) do update set
  name = excluded.name, rarity = excluded.rarity, rarity_rank = excluded.rarity_rank, version = excluded.version,
  type = excluded.type, image_url = excluded.image_url, external_id = excluded.external_id;

select set_id, count(*) as carte from public.tcg_cards where set_id like 'pokemon-30th%' group by set_id order by set_id;
