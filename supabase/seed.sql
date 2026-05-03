-- ============================================================
-- Atlas — Seed Data: 45 US Driving Roads
-- Run AFTER schema.sql
-- ============================================================

insert into public.roads
  (name, designation, state, region, type, length_mi, difficulty, best_season, highlight, lat, lng)
values

-- ── West Coast ────────────────────────────────────────────────
('Pacific Coast Highway', 'CA-1', 'California', 'West Coast', 'Coastal',
 123.0, 'Easy', 'Year-round', 'Dramatic cliffs, ocean views, and Big Sur wilderness', 35.70, -121.30),

('Cascade Lakes Scenic Byway', 'OR-46', 'Oregon', 'West Coast', 'Scenic',
 66.0, 'Easy', 'Jun–Oct', 'Volcanic peaks reflected in alpine lakes', 43.90, -121.70),

('Olympic Peninsula Loop', 'US-101', 'Washington', 'West Coast', 'Scenic',
 330.0, 'Easy', 'May–Sep', 'Rainforest, coastline, and snow-capped peaks in one loop', 47.80, -123.90),

('Angeles Crest Highway', 'CA-2', 'California', 'West Coast', 'Mountain',
 65.0, 'Challenging', 'Apr–Nov', 'High-altitude sweepers through the San Gabriel Mountains', 34.27, -117.79),

('Redwood Highway', 'US-199', 'California', 'West Coast', 'Scenic',
 50.0, 'Easy', 'Year-round', 'Cathedral groves of ancient coastal redwoods', 41.80, -123.90),

('Oregon Coast Highway', 'US-101', 'Oregon', 'West Coast', 'Coastal',
 363.0, 'Easy', 'Year-round', 'Sea stacks, sea lions, and endless ocean panoramas', 44.84, -124.05),

-- ── Mountain West ─────────────────────────────────────────────
('Beartooth Highway', 'US-212', 'Montana/Wyoming', 'Mountain West', 'Mountain',
 69.0, 'Challenging', 'May–Oct', 'Charles Kuralt called it the most beautiful road in America', 45.00, -109.45),

('Going-to-the-Sun Road', 'GTTS', 'Montana', 'Mountain West', 'Mountain',
 50.0, 'Moderate', 'Jul–Sep', 'Only road to cross the Continental Divide in Glacier NP', 48.70, -113.80),

('Trail Ridge Road', 'US-34', 'Colorado', 'Mountain West', 'Mountain',
 48.0, 'Moderate', 'May–Oct', 'Highest continuous paved road in the US at 12,183 ft', 40.40, -105.71),

('Million Dollar Highway', 'US-550', 'Colorado', 'Mountain West', 'Mountain',
 25.0, 'Expert', 'May–Oct', 'Hairpins with no guardrails above 11,000-ft alpine passes', 37.80, -107.70),

('Chief Joseph Scenic Highway', 'WY-296', 'Wyoming', 'Mountain West', 'Scenic',
 46.0, 'Moderate', 'May–Oct', 'Breathtaking views into the Clark''s Fork canyon', 44.65, -109.58),

('Logan Canyon Scenic Byway', 'US-89', 'Utah', 'Mountain West', 'Scenic',
 41.0, 'Easy', 'May–Oct', 'Limestone walls, fly-fishing streams, and fall color', 41.80, -111.50),

-- ── Southwest ─────────────────────────────────────────────────
('Arizona Highway 89A (Oak Creek)', 'AZ-89A', 'Arizona', 'Southwest', 'Canyon',
 14.0, 'Moderate', 'Mar–Nov', 'Switchbacks dropping into the red-rock Sedona canyon', 34.88, -111.80),

('Route 66 (Historic)', 'Historic US-66', 'Arizona/New Mexico', 'Southwest', 'Historic',
 400.0, 'Easy', 'Apr–Oct', 'The Mother Road — neon motels, diners, and desert vastness', 35.30, -113.60),

('Zion–Mount Carmel Highway', 'UT-9', 'Utah', 'Southwest', 'Canyon',
 24.0, 'Moderate', 'Year-round', 'Switchbacks and tunnels carved into Navajo sandstone', 37.21, -112.94),

('Arches Scenic Drive', 'UT-191', 'Utah', 'Southwest', 'Desert',
 18.0, 'Easy', 'Mar–May, Sep–Nov', 'Over 2,000 natural sandstone arches', 38.72, -109.59),

('Extraterrestrial Highway', 'NV-375', 'Nevada', 'Southwest', 'Desert',
 98.0, 'Easy', 'Year-round', 'Desolate desert near Area 51 — straight, fast, and otherworldly', 37.60, -115.80),

('Death Valley Badwater Road', 'CA-190', 'California', 'Southwest', 'Desert',
 85.0, 'Easy', 'Oct–Apr', 'Lowest point in North America with stark salt-flat vistas', 36.23, -116.77),

-- ── Southeast ─────────────────────────────────────────────────
('Tail of the Dragon', 'US-129', 'North Carolina/Tennessee', 'Southeast', 'Technical',
 11.0, 'Expert', 'Apr–Oct', '318 curves in 11 miles — the world-famous driver''s road', 35.47, -83.98),

('Blue Ridge Parkway', 'BRP', 'Virginia/North Carolina', 'Southeast', 'Scenic',
 469.0, 'Easy', 'Apr–Nov', 'America''s favorite drive — sweeping Appalachian vistas', 36.00, -81.70),

('Cherohala Skyway', 'TN-165/NC-143', 'Tennessee/North Carolina', 'Southeast', 'Mountain',
 43.0, 'Moderate', 'Apr–Nov', 'High-speed sweepers through ancient Cherokee wilderness', 35.35, -84.20),

('Natchez Trace Parkway', 'Natchez Trace', 'Mississippi/Tennessee', 'Southeast', 'Historic',
 444.0, 'Easy', 'Year-round', 'Historic road through 10,000 years of American history', 34.50, -89.20),

('Skyline Drive', 'Skyline Dr', 'Virginia', 'Southeast', 'Scenic',
 105.0, 'Easy', 'Apr–Nov', '105 miles of ridgeline driving along Shenandoah NP', 38.52, -78.45),

('Deals Gap / Foothills Parkway', 'US-321', 'Tennessee', 'Southeast', 'Technical',
 17.0, 'Challenging', 'Apr–Oct', 'Stunning ridgeline views above Great Smoky Mountains', 35.60, -83.80),

('Cumberland Gap Highway', 'US-25E', 'Kentucky/Tennessee', 'Southeast', 'Historic',
 55.0, 'Moderate', 'Year-round', 'The gateway pioneers used to cross the Appalachians', 36.60, -83.67),

-- ── Northeast ─────────────────────────────────────────────────
('Kancamagus Highway', 'NH-112', 'New Hampshire', 'Northeast', 'Scenic',
 34.5, 'Easy', 'Sep–Oct', 'New England''s best fall foliage corridor through White Mountains', 44.00, -71.40),

('Acadia Scenic Byway', 'ME-3', 'Maine', 'Northeast', 'Coastal',
 40.0, 'Easy', 'May–Oct', 'Rocky Atlantic coastline and Acadia National Park carriage roads', 44.30, -68.20),

('Mount Washington Auto Road', 'Auto Road', 'New Hampshire', 'Northeast', 'Mountain',
 7.6, 'Expert', 'May–Oct', 'Highest peak in the Northeast — weather observatory at summit', 44.27, -71.30),

('Mohawk Trail', 'MA-2', 'Massachusetts', 'Northeast', 'Historic',
 63.0, 'Easy', 'Sep–Oct', 'America''s first scenic highway through the Berkshires', 42.60, -72.90),

('Adirondack Trail', 'NY-30', 'New York', 'Northeast', 'Scenic',
 200.0, 'Easy', 'Jun–Oct', 'Six million acres of wilderness lakes and forested peaks', 43.70, -74.40),

('Vermont Route 100', 'VT-100', 'Vermont', 'Northeast', 'Scenic',
 217.0, 'Easy', 'Sep–Oct', 'The backbone of Vermont — farms, covered bridges, ski towns', 43.90, -72.70),

-- ── Midwest ───────────────────────────────────────────────────
('Great River Road', 'GRR', 'Illinois/Wisconsin', 'Midwest', 'Scenic',
 250.0, 'Easy', 'May–Oct', 'Follows the Mississippi through bluffs, locks, and river towns', 42.50, -90.60),

('Lake Superior Circle Tour', 'US-2/61', 'Michigan/Wisconsin/Minnesota', 'Midwest', 'Scenic',
 1300.0, 'Easy', 'Jun–Sep', 'Circumnavigates the world''s largest freshwater lake by surface area', 47.00, -91.00),

('Ohio River Scenic Byway', 'OH-52', 'Ohio', 'Midwest', 'Historic',
 452.0, 'Easy', 'Apr–Oct', 'Follows the Ohio River through towns that shaped American history', 38.70, -83.00),

('Tunnel of Trees Highway', 'MI-119', 'Michigan', 'Midwest', 'Scenic',
 20.0, 'Easy', 'May–Oct', 'A cathedral of hardwoods arching over the two-lane along Lake Michigan', 45.50, -85.10),

('Talimena Scenic Drive', 'OK-1', 'Oklahoma/Arkansas', 'Midwest', 'Scenic',
 54.0, 'Moderate', 'Oct–Nov', 'Ridgeline drive through the Ouachita Mountains with panoramic views', 34.70, -94.60),

('Loess Hills Scenic Byway', 'IA-127', 'Iowa', 'Midwest', 'Scenic',
 220.0, 'Easy', 'Apr–Nov', 'Wind-deposited bluffs unique to Iowa and China', 42.00, -95.90),

-- ── Additional highlights ──────────────────────────────────────
('Pikes Peak Highway', 'Pikes Peak Hwy', 'Colorado', 'Mountain West', 'Mountain',
 19.0, 'Challenging', 'May–Oct', 'Race-famous toll road to 14,115 ft summit — pure grip test', 38.84, -105.04),

('White Rim Road', 'White Rim', 'Utah', 'Southwest', 'Off-road',
 100.0, 'Challenging', 'Mar–May, Sep–Nov', '100-mile 4WD loop inside Canyonlands above the Colorado River', 38.25, -109.90),

('Alaska Highway (ALCAN)', 'AK-1', 'Alaska', 'Mountain West', 'Scenic',
 1390.0, 'Challenging', 'Jun–Aug', 'The ultimate North American road trip through subarctic wilderness', 64.00, -145.00),

('Lolo Pass Road', 'US-12', 'Montana/Idaho', 'Mountain West', 'Mountain',
 99.0, 'Moderate', 'May–Oct', 'Lewis & Clark''s route over the Bitterroot Mountains', 46.63, -114.57),

('Hana Highway', 'HI-360', 'Hawaii', 'West Coast', 'Coastal',
 52.0, 'Moderate', 'Year-round', '620 curves and 59 bridges through lush Maui rainforest', 20.80, -156.00),

('Loneliest Road in America', 'US-50', 'Nevada', 'Southwest', 'Desert',
 287.0, 'Easy', 'Year-round', 'Crosses the Great Basin on the same route as the Pony Express', 39.50, -117.00),

('New Mexico High Road to Taos', 'NM-76', 'New Mexico', 'Southwest', 'Historic',
 56.0, 'Moderate', 'Apr–Oct', 'Adobe villages, mountain meadows, and Sangre de Cristo views', 36.10, -105.60),

('Seward Highway', 'AK-1', 'Alaska', 'Mountain West', 'Scenic',
 127.0, 'Moderate', 'May–Sep', 'Tidal flats, glaciers, and beluga whales along Turnagain Arm', 60.90, -149.50);
