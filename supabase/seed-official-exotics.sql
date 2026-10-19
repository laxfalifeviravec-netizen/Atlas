-- Posts exotic-car photos and rollers (short videos) from the official "One Culture" account.
--
-- BEFORE RUNNING
--   1. In Supabase: Storage -> uploads bucket -> drag in your photos named
--      exotic-01.jpg, exotic-02.jpg ... exotic-20.jpg  (and videos exotic-roller-01.mp4 ... 05).
--   2. Edit the car name / blurb on each row below so it matches the photo with that number.
--   3. Put the photographer's name in the credit column if the photo isn't yours (leave '' otherwise).
--   4. Run this script ONCE. Running it twice posts everything twice.
--
-- Posts are spread over the last ~8 days so the feed doesn't show 25 posts in one minute.
-- No likes, comments or fake users are created.

-- ── Photo posts ───────────────────────────────────────────────────────────
with me as (
  select id from users where name = 'One Culture' order by id limit 1
), items as (
  select * from (values
    (1,  'exotic-01.jpg', 'Ferrari 296 GTB',            'Mid-engine hybrid V6 with a Ferrari soul.', ''),
    (2,  'exotic-02.jpg', 'Lamborghini Huracán STO',    'Race-car aero on a road-legal car.', ''),
    (3,  'exotic-03.jpg', 'McLaren 720S',               'Carbon tub, twin-turbo V8, doors that swing up like wings.', ''),
    (4,  'exotic-04.jpg', 'Porsche 911 GT3 RS',         'Naturally aspirated flat-six and a wing you can''t ignore.', ''),
    (5,  'exotic-05.jpg', 'Aston Martin DBS',           'A grand tourer with a very loud V12 opinion.', ''),
    (6,  'exotic-06.jpg', 'Bugatti Chiron',             'Quad-turbo W16. Numbers that read like typos.', ''),
    (7,  'exotic-07.jpg', 'Koenigsegg Jesko',           'Hypercar engineering from a tiny Swedish factory.', ''),
    (8,  'exotic-08.jpg', 'Pagani Huayra',              'A rolling sculpture. Every bolt is a piece of art.', ''),
    (9,  'exotic-09.jpg', 'Lotus Emira',                'Lightweight, playful, and the last petrol Lotus.', ''),
    (10, 'exotic-10.jpg', 'Mercedes-AMG GT Black Series','Hand-built V8 with a flat-plane crank.', ''),
    (11, 'exotic-11.jpg', 'Nissan GT-R Nismo',          'Godzilla still bites.', ''),
    (12, 'exotic-12.jpg', 'Audi R8 V10',                'Naturally aspirated V10 you can actually daily.', ''),
    (13, 'exotic-13.jpg', 'Chevrolet Corvette Z06',     'Flat-plane-crank V8 that spins to 8,600 rpm.', ''),
    (14, 'exotic-14.jpg', 'Ford GT',                    'Le Mans heritage for the road.', ''),
    (15, 'exotic-15.jpg', 'Maserati MC20',              'Mid-engine Italian V6 with a gorgeous silhouette.', ''),
    (16, 'exotic-16.jpg', 'Lamborghini Aventador SVJ',  'V12 madness, no apologies.', ''),
    (17, 'exotic-17.jpg', 'Ferrari F8 Tributo',         'A twin-turbo V8 tribute to Ferrari''s best.', ''),
    (18, 'exotic-18.jpg', 'BMW M4 CSL',                 'Lightweight, loud, and limited.', ''),
    (19, 'exotic-19.jpg', 'Lexus LFA',                  'That V10 sound is still unmatched.', ''),
    (20, 'exotic-20.jpg', 'Rimac Nevera',               'Four electric motors and a launch that bends your face.', '')
  ) as t(n, file, car, blurb, credit)
)
insert into posts (user_id, image_url, image_urls, caption, created_at)
select me.id,
       base.url || items.file,
       array[base.url || items.file],
       items.car || E' — ' || items.blurb
         || case when items.n % 3 = 0 then E'\nWhich one would you drive?' else '' end
         || case when items.credit <> '' then E'\n📷 ' || items.credit else '' end,
       now() - make_interval(hours => items.n * 10)
from me
cross join items
cross join (select 'https://plglrafzgbkuehfdxbol.supabase.co/storage/v1/object/public/uploads/'::text as url) base;

-- ── Rollers (short videos) ────────────────────────────────────────────────
-- Edit each caption to describe the clip you uploaded.
with me as (
  select id from users where name = 'One Culture' order by id limit 1
), items as (
  select * from (values
    (1, 'exotic-roller-01.mp4', 'Rolling shot. Which one would you take?'),
    (2, 'exotic-roller-02.mp4', 'Cold start. Listen to that.'),
    (3, 'exotic-roller-03.mp4', 'Canyon run.'),
    (4, 'exotic-roller-04.mp4', 'Pull on a closed road.'),
    (5, 'exotic-roller-05.mp4', 'Sunday drive.')
  ) as t(n, file, caption)
)
insert into posts (user_id, image_url, image_urls, caption, created_at)
select me.id,
       base.url || items.file,
       array[base.url || items.file],
       items.caption,
       now() - make_interval(hours => items.n * 14 + 5)
from me
cross join items
cross join (select 'https://plglrafzgbkuehfdxbol.supabase.co/storage/v1/object/public/uploads/'::text as url) base;
