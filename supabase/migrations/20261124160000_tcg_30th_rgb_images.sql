-- Mew RGB (B/G/R) del set 30° Anniversario: né TCGdex né la galleria ufficiale
-- hanno le immagini (carte segrete). Uso le scansioni inglesi di Bulbapedia.
update public.tcg_cards c set image_url = v.url
from (values
  ('30th-B', 'https://archives.bulbagarden.net/media/upload/6/6a/Mew30thCelebrationB.jpg'),
  ('30th-G', 'https://archives.bulbagarden.net/media/upload/4/4d/Mew30thCelebrationG.jpg'),
  ('30th-R', 'https://archives.bulbagarden.net/media/upload/9/98/Mew30thCelebrationR.jpg')
) as v(ext, url)
where c.set_id = 'pokemon-30th' and c.external_id = v.ext;

select number_label, name, image_url from public.tcg_cards where set_id = 'pokemon-30th' and number_label is not null order by number;
