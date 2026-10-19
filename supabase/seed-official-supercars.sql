-- Posts 10 supercar photos from the official "One Culture" account. Run once in the Supabase SQL Editor.
-- Photos load straight from Unsplash/Pexels (free to use), so nothing needs uploading.
-- No likes, comments or fake users are created. Times are spread over the last few days.
with me as (
  select id from users where name = 'One Culture' order by id limit 1
), items as (
  select * from (values
    (1,  'https://images.unsplash.com/photo-1614200187524-dc4b892acf16?w=1200&auto=format&fit=crop&q=80', 'Porsche 911 GT3 RS. Naturally aspirated flat-six, and a wing you can''t ignore. Which one would you drive?'),
    (2,  'https://images.pexels.com/photos/20296995/pexels-photo-20296995.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Lamborghini Huracán with the aero to match. Rate the spoiler.'),
    (3,  'https://images.pexels.com/photos/17377925/pexels-photo-17377925.jpeg?auto=compress&cs=tinysrgb&w=1200', 'McLaren 720S from the back. Best view in the car park.'),
    (4,  'https://images.pexels.com/photos/31565014/pexels-photo-31565014.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Lamborghini Revuelto in yellow. The V12 hybrid era has arrived.'),
    (5,  'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1200&auto=format&fit=crop&q=80', 'BMW M3 Competition in Frozen Isle Green. What''s your favourite M colour?'),
    (6,  'https://images.pexels.com/photos/29115178/pexels-photo-29115178.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Yellow McLaren, industrial backdrop. Fits perfectly.'),
    (7,  'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Black Lamborghini. Some cars don''t need a colour.'),
    (8,  'https://images.pexels.com/photos/19106767/pexels-photo-19106767.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Dark green McLaren, up close. Carbon, curves and dusk light.'),
    (9,  'https://images.pexels.com/photos/30092960/pexels-photo-30092960.jpeg?auto=compress&cs=tinysrgb&w=1200', 'McLaren on an open road. This is what they are built for.'),
    (10, 'https://images.pexels.com/photos/9322199/pexels-photo-9322199.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Yellow Lamborghini, close-up. Pure drama.')
  ) as t(n, url, caption)
)
insert into posts (user_id, image_url, image_urls, caption, created_at)
select me.id, items.url, array[items.url], items.caption, now() - make_interval(hours => items.n * 9)
from me cross join items;
