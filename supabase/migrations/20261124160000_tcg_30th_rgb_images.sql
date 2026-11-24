-- Mew RGB (B/G/R) del set 30° Anniversario: né TCGdex né la galleria ufficiale
-- hanno le immagini (carte segrete). Uso le immagini del CDN di TCGplayer
-- (Bulbapedia blocca le immagini mostrate su altri siti).
update public.tcg_cards c set image_url = v.url
from (values
  ('30th-R', 'https://tcgplayer-cdn.tcgplayer.com/product/717607_in_1000x1000.jpg'),
  ('30th-G', 'https://tcgplayer-cdn.tcgplayer.com/product/717608_in_1000x1000.jpg'),
  ('30th-B', 'https://tcgplayer-cdn.tcgplayer.com/product/717609_in_1000x1000.jpg')
) as v(ext, url)
where c.set_id = 'pokemon-30th' and c.external_id = v.ext;

select number_label, name, image_url from public.tcg_cards where set_id = 'pokemon-30th' and number_label is not null order by number;
