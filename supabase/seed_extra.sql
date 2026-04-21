-- ============================================================
-- Atlas — Extra Roads Seed (49 additional roads)
-- Run AFTER schema.sql and seed.sql
-- ============================================================

insert into public.roads
  (name, designation, state, region, type, length_mi, difficulty, best_season, highlight, lat, lng)
values

-- ── West Coast — California ───────────────────────────────────
('Eastern Sierra Scenic Byway', 'US-395', 'California', 'West Coast', 'Scenic',
 232.0, 'Easy', 'May-Oct', 'Sky-high peaks, volcanic craters, hot springs, and ghost towns along the Sierra spine', 37.50, -118.60),

('Tioga Pass Road', 'CA-120', 'California', 'West Coast', 'Mountain',
 55.0, 'Challenging', 'Jun-Oct', 'Yosemite''s only cross-park road crests at 9,945 ft through granite wilderness', 37.88, -119.55),

('California Highway 36', 'CA-36', 'California', 'West Coast', 'Technical',
 140.0, 'Expert', 'May-Nov', 'Some of the most relentless twists in America through remote redwood and pine forest', 40.10, -122.80),

-- ── West Coast — Washington ───────────────────────────────────
('Cascade Loop', 'US-2/WA-20', 'Washington', 'West Coast', 'Scenic',
 440.0, 'Easy', 'May-Oct', '440-mile loop through the American Alps, Skagit Valley farmland, and eastern desert plateaus', 47.80, -120.50),

('North Cascades Highway', 'WA-20', 'Washington', 'West Coast', 'Mountain',
 85.0, 'Moderate', 'May-Nov', 'Jagged glaciated peaks and turquoise lakes — the wildest paved highway in the lower 48', 48.52, -120.65),

-- ── West Coast — Oregon ───────────────────────────────────────
('Columbia River Historic Highway', 'US-30', 'Oregon', 'West Coast', 'Historic',
 73.0, 'Easy', 'Year-round', 'America''s first scenic highway winds past Multnomah Falls and Crown Point above the gorge', 45.55, -122.10),

('Mount Hood Scenic Byway', 'US-26', 'Oregon', 'West Coast', 'Mountain',
 105.0, 'Easy', 'Year-round', 'Circles Oregon''s tallest volcano through old-growth forest, orchard country, and ski terrain', 45.37, -121.70),

('Umpqua Scenic Byway', 'OR-138', 'Oregon', 'West Coast', 'Scenic',
 80.0, 'Easy', 'Year-round', 'The highway of waterfalls follows the North Umpqua River through ancient forest', 43.29, -122.50),

('Crater Lake Rim Drive', 'OR-62', 'Oregon', 'West Coast', 'Scenic',
 33.0, 'Easy', 'Jul-Oct', 'Circles the deepest lake in the US — electric-blue water inside a collapsed volcano', 42.94, -122.10),

-- ── Mountain West — Colorado ──────────────────────────────────
('San Juan Skyway', 'CO-145/550', 'Colorado', 'Mountain West', 'Mountain',
 236.0, 'Challenging', 'May-Oct', '236 miles of 14,000-ft passes, Victorian mining towns, and Anasazi cliff dwellings', 37.46, -107.88),

('Independence Pass', 'CO-82', 'Colorado', 'Mountain West', 'Mountain',
 50.0, 'Expert', 'Jun-Oct', 'Crosses the Continental Divide at 12,095 ft on a narrow ledge road between Aspen and Twin Lakes', 39.10, -106.59),

('Black Canyon Scenic Drive', 'CO-92', 'Colorado', 'Mountain West', 'Canyon',
 30.0, 'Moderate', 'Apr-Nov', 'Rim road along one of America''s most dramatic gorges — 2,700 ft of near-vertical black walls', 38.58, -107.65),

-- ── Mountain West — Wyoming ───────────────────────────────────
('Snowy Range Scenic Byway', 'WY-130', 'Wyoming', 'Mountain West', 'Mountain',
 29.0, 'Moderate', 'Jun-Oct', 'Crosses the Medicine Bow Mountains at 10,847 ft with alpine lakes and wildflower meadows', 41.36, -106.26),

-- ── Mountain West — Idaho ─────────────────────────────────────
('Salmon River Scenic Byway', 'US-93', 'Idaho', 'Mountain West', 'Scenic',
 161.0, 'Moderate', 'May-Oct', 'Follows the River of No Return through the deepest gorge on the continent', 45.20, -114.00),

('Hells Canyon Scenic Byway', 'OR-86', 'Idaho/Oregon', 'Mountain West', 'Canyon',
 218.0, 'Challenging', 'May-Oct', 'Towers above the deepest river gorge in North America along the wild Snake River', 45.40, -116.80),

-- ── Mountain West — Alaska ────────────────────────────────────
('Denali Highway', 'AK-8', 'Alaska', 'Mountain West', 'Scenic',
 135.0, 'Challenging', 'Jun-Sep', 'Remote tundra highway with unobstructed Denali views and wandering caribou herds', 63.50, -147.50),

('Richardson Highway', 'AK-4', 'Alaska', 'Mountain West', 'Scenic',
 368.0, 'Easy', 'May-Sep', 'Alaska''s first road runs from the Valdez glacier port through the Chugach Mountains to Fairbanks', 63.00, -145.50),

-- ── Southwest — Utah ─────────────────────────────────────────
('Highway 12 Scenic Byway', 'UT-12', 'Utah', 'Southwest', 'Canyon',
 124.0, 'Moderate', 'Apr-Oct', 'Named the most scenic byway in America — connects Bryce Canyon to Capitol Reef through slot canyons', 37.78, -111.43),

('Scenic Byway 128 / River Road', 'UT-128', 'Utah', 'Southwest', 'Canyon',
 44.0, 'Easy', 'Year-round', 'The Colorado River carves through towering red rock walls just outside Moab', 38.80, -109.60),

('Dead Horse Point Road', 'UT-313', 'Utah', 'Southwest', 'Desert',
 15.0, 'Easy', 'Year-round', 'A finger mesa 2,000 ft above the Colorado River bend with a 270-degree panorama', 38.48, -109.86),

('Moki Dugway', 'UT-261', 'Utah', 'Southwest', 'Off-road',
 17.0, 'Expert', 'Mar-Nov', 'An unpaved cliff-edge descent with 1,100 ft of switchbacks into the Valley of the Gods', 37.23, -109.98),

-- ── Southwest — Arizona ───────────────────────────────────────
('Red Rock Scenic Byway', 'AZ-179', 'Arizona', 'Southwest', 'Canyon',
 8.0, 'Easy', 'Year-round', 'Eight miles through the heart of Sedona''s fire-red sandstone formations', 34.78, -111.76),

('Monument Valley Road', 'US-163', 'Arizona', 'Southwest', 'Desert',
 26.0, 'Easy', 'Year-round', 'The most iconic desert panorama in America — Forrest Gump''s road through the Navajo Nation', 36.98, -110.10),

('Mount Lemmon Scenic Byway', 'AZ-89', 'Arizona', 'Southwest', 'Mountain',
 27.0, 'Moderate', 'Year-round', 'Climbs from saguaro cactus desert to Canadian-zone pine forest in just 27 miles', 32.43, -110.79),

-- ── Southwest — New Mexico ────────────────────────────────────
('Enchanted Circle Scenic Byway', 'NM-522', 'New Mexico', 'Southwest', 'Mountain',
 84.0, 'Moderate', 'May-Oct', '84-mile mountain loop through Taos, Red River, and Eagle Nest Lake in the Sangre de Cristos', 36.60, -105.38),

('Sandia Crest Road', 'NM-536', 'New Mexico', 'Southwest', 'Mountain',
 14.0, 'Moderate', 'May-Oct', 'Climbs to 10,378 ft above Albuquerque — on clear days you can see 11,000 square miles', 35.21, -106.45),

-- ── Southwest — Texas ─────────────────────────────────────────
('Twisted Sisters', 'FM 335/336/337', 'Texas', 'Southwest', 'Technical',
 100.0, 'Expert', 'Oct-Apr', 'Three interlinked Hill Country ranch roads with 65+ sharp curves in 15 miles — Texas''s best', 29.80, -99.80),

('River Road', 'FM-170', 'Texas', 'Southwest', 'Desert',
 50.0, 'Moderate', 'Oct-Apr', 'Hugs the Rio Grande through sheer canyons on the edge of Big Bend ranch country', 29.44, -104.20),

-- ── Southeast — Florida ───────────────────────────────────────
('Overseas Highway', 'US-1', 'Florida', 'Southeast', 'Coastal',
 113.0, 'Easy', 'Year-round', '42 bridges connect the Florida Keys over crystal-clear Atlantic and Gulf waters to Key West', 24.88, -80.66),

('Tamiami Trail', 'US-41', 'Florida', 'Southeast', 'Scenic',
 75.0, 'Easy', 'Nov-Apr', 'Crosses the Everglades sawgrass prairie with alligators and roseate spoonbills roadside', 25.80, -81.20),

-- ── Southeast — Georgia ───────────────────────────────────────
('Russell-Brasstown Scenic Byway', 'GA-348/180', 'Georgia', 'Southeast', 'Mountain',
 40.0, 'Moderate', 'Apr-Nov', 'Sweeping Appalachian views and the highest paved road in Georgia at Brasstown Bald', 34.75, -83.95),

-- ── Southeast — Alabama ───────────────────────────────────────
('Little River Canyon Byway', 'AL-35', 'Alabama', 'Southeast', 'Canyon',
 22.0, 'Moderate', 'Year-round', 'Follows the rim of the deepest canyon east of the Mississippi River through a forested plateau', 34.38, -85.62),

-- ── Southeast — Tennessee / North Carolina ────────────────────
('Newfound Gap Road', 'US-441', 'Tennessee/North Carolina', 'Southeast', 'Mountain',
 31.0, 'Moderate', 'Year-round', 'The backbone of the Smokies — crosses the Appalachians at 5,048 ft through misty old-growth', 35.61, -83.43),

('Highway 421 / The Snake', 'US-421', 'Tennessee/Virginia', 'Southeast', 'Technical',
 37.0, 'Challenging', 'Apr-Oct', '489 curves through the High Knob highlands — more total corners than the Dragon itself', 36.60, -81.80),

-- ── Northeast — Vermont ───────────────────────────────────────
('Smugglers Notch', 'VT-108', 'Vermont', 'Northeast', 'Mountain',
 10.0, 'Expert', 'May-Oct', 'A boulder-choked notch with switchbacks so tight that trucks are legally banned from the route', 44.55, -72.78),

-- ── Northeast — Pennsylvania ──────────────────────────────────
('Pennsylvania Route 6 Scenic Byway', 'PA-6', 'Pennsylvania', 'Northeast', 'Scenic',
 400.0, 'Easy', 'Apr-Nov', 'Crosses the northern tier through pine forests, Appalachian gorges, and Victorian-era towns', 41.60, -77.50),

('Pennsylvania Route 44', 'PA-44', 'Pennsylvania', 'Northeast', 'Scenic',
 60.0, 'Easy', 'May-Oct', 'Over 60 miles through Tiadaghton Forest with no stop signs and almost no traffic', 41.30, -77.40),

-- ── Northeast — New York ──────────────────────────────────────
('Catskills Scenic Byway', 'NY-28', 'New York', 'Northeast', 'Scenic',
 64.0, 'Easy', 'May-Oct', 'Winds through the heart of the Catskills past trout streams, covered bridges, and artists'' hamlets', 42.10, -74.50),

('Finger Lakes Scenic Byway', 'NY-414', 'New York', 'Northeast', 'Scenic',
 100.0, 'Easy', 'May-Oct', 'Vineyard-lined shores of Seneca and Cayuga Lakes with gorge waterfalls at every bend', 42.60, -76.80),

-- ── Northeast — Maine ─────────────────────────────────────────
('Maine Coastal Route 1', 'US-1', 'Maine', 'Northeast', 'Coastal',
 220.0, 'Easy', 'May-Oct', 'Classic Maine coast — lobster shacks, rocky headlands, and working fishing harbors', 44.50, -68.00),

-- ── Midwest — South Dakota ───────────────────────────────────
('Needles Highway', 'SD-87', 'South Dakota', 'Midwest', 'Mountain',
 14.0, 'Challenging', 'May-Oct', 'Granite spires and needle-eye tunnels cut through the Black Hills of Custer State Park', 43.75, -103.55),

('Iron Mountain Road', 'US-16A', 'South Dakota', 'Midwest', 'Mountain',
 17.0, 'Expert', 'May-Oct', 'Pigtail bridges, spiral turns, and Mount Rushmore perfectly framed in rock tunnels', 43.80, -103.45),

-- ── Midwest — Minnesota ───────────────────────────────────────
('North Shore Scenic Drive', 'US-61', 'Minnesota', 'Midwest', 'Scenic',
 154.0, 'Easy', 'Year-round', 'Lake Superior''s rugged north shore with waterfalls, basalt cliffs, and historic harbor towns', 47.20, -91.10),

-- ── Midwest — Michigan ────────────────────────────────────────
('M-22 Scenic Highway', 'M-22', 'Michigan', 'Midwest', 'Coastal',
 116.0, 'Easy', 'Year-round', 'Hugs Lake Michigan''s dune coastline through cherry orchards and Sleeping Bear Dunes', 44.90, -86.00),

-- ── Midwest — Wisconsin ───────────────────────────────────────
('Door County Scenic Byway', 'WI-42/57', 'Wisconsin', 'Midwest', 'Coastal',
 60.0, 'Easy', 'May-Oct', 'The Cape Cod of the Midwest — cherry orchards, fishing villages, and Green Bay bluff views', 44.85, -87.35),

('Kettle Moraine Scenic Drive', 'WI-67', 'Wisconsin', 'Midwest', 'Scenic',
 115.0, 'Easy', 'Apr-Nov', 'Rolls through glacier-carved kettles, eskers, and drumlins of the Ice Age National Trail', 43.60, -88.20),

-- ── Midwest — Kansas ─────────────────────────────────────────
('Flint Hills Scenic Byway', 'US-177', 'Kansas', 'Midwest', 'Scenic',
 47.0, 'Easy', 'Apr-Oct', 'The last large expanse of tallgrass prairie on earth — rolling hills, big sky, and cattle country', 38.50, -96.70),

-- ── Midwest — Nebraska ────────────────────────────────────────
('Sandhills Journey Scenic Byway', 'US-83', 'Nebraska', 'Midwest', 'Scenic',
 272.0, 'Easy', 'May-Sep', 'Deep into the remote Nebraska Sandhills — 19,000 square miles of grass-stabilized ancient dunes', 42.40, -100.80),

-- ── Midwest — North Dakota ────────────────────────────────────
('Maah Daah Hey Scenic Road', 'ND-46', 'North Dakota', 'Midwest', 'Scenic',
 100.0, 'Moderate', 'May-Oct', 'Badlands buttes, roaming bison, and petrified wood through Theodore Roosevelt country', 46.90, -103.50);
