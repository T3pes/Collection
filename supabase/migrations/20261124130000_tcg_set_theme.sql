-- =====================================================================
-- Tema per singolo set (facoltativo): sovrascrive i colori della collezione
-- solo per le chiavi presenti. Colori Pokémon presi dalle gallerie ufficiali
-- tcg.pokemon.com (phantasmal-flames.css, pitch-black.css).
-- Idempotente.
-- =====================================================================

alter table public.tcg_sets add column if not exists theme jsonb;

-- Fiamme Spettrali: blu notte -> nero, arancio/oro e acqua
update public.tcg_sets
set theme = '{"accent":"#FF9C33","accent2":"#45B1DB","ink":"#F4F7FF","bg":"#03051A","bg2":"#101A6E","glow":"rgba(255,136,99,0.45)","pattern":"stars"}'
where id = 'pokemon-me02';

-- Buio Pesto: nero -> viola, magenta e verde acido
update public.tcg_sets
set theme = '{"accent":"#E339B8","accent2":"#A9C735","ink":"#F7F2FF","bg":"#000000","bg2":"#3E0A66","glow":"rgba(227,57,184,0.45)","pattern":"stars"}'
where id = 'pokemon-me05';

select id, theme from public.tcg_sets order by collection_id, sort;
