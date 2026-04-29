/* ============================================================
   Atlas — All Roads Map Page JS
   ============================================================ */

// ── Theme ─────────────────────────────────────────────────────
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('atlas-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('atlas-theme', next);
  updateMapTiles(next);
});

// ── Navbar ─────────────────────────────────────────────────────
const navbar    = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 10), { passive: true });
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.classList.toggle('active', open);
  navToggle.setAttribute('aria-expanded', open);
});

// ── Roads Data ─────────────────────────────────────────────────
const TYPE_COLORS = {
  Mountain:  '#f97316',
  Coastal:   '#0ea5e9',
  Technical: '#ef4444',
  Scenic:    '#22c55e',
  Desert:    '#eab308',
  Historic:  '#a855f7',
  Canyon:    '#f59e0b',
  'Off-road':'#6b7280',
};

const TYPE_CHARACTER = {
  Mountain:   'Curves',
  Technical:  'Curves',
  Canyon:     'Curves',
  Coastal:    'Curves',
  Scenic:     'Mixed',
  'Off-road': 'Mixed',
  Desert:     'Straightaways',
  Historic:   'Straightaways',
};

const TYPE_BEST_TIME = {
  Mountain:  { best: 'Weekday mornings',         avoid: 'Summer & holiday weekends' },
  Coastal:   { best: 'Early weekday mornings',   avoid: 'Summer beach weekends' },
  Technical: { best: 'Any weekday',              avoid: 'Weekend afternoons' },
  Scenic:    { best: 'Golden hour, weekdays',    avoid: 'Peak fall-foliage weekends' },
  Desert:    { best: 'Early morning or dusk',    avoid: 'Summer midday (100°F+)' },
  Historic:  { best: 'Spring & fall weekdays',   avoid: 'Summer holiday weekends' },
  Canyon:    { best: 'Weekday mornings',         avoid: 'After heavy rain (rockslides)' },
  'Off-road':{ best: 'Dry season only',          avoid: 'After heavy rain' },
};

// ── Drive Log (localStorage-backed, optional Supabase sync) ───
const _drivenSet  = new Set(JSON.parse(localStorage.getItem('atlas-driven')      || '[]'));
const _savedSet   = new Set(JSON.parse(localStorage.getItem('atlas-bucket')      || '[]'));
const _drivenMeta = JSON.parse(localStorage.getItem('atlas-driven-meta') || '{}');

function _persistDriven() {
  localStorage.setItem('atlas-driven',      JSON.stringify([..._drivenSet]));
  localStorage.setItem('atlas-driven-meta', JSON.stringify(_drivenMeta));
}
function _persistSaved() {
  localStorage.setItem('atlas-bucket', JSON.stringify([..._savedSet]));
}

const ROADS = [
  // ── West Coast ──────────────────────────────────────────────
  {
    name: 'Pacific Coast Highway',
    designation: 'Hwy 1',
    state: 'California',
    region: 'West Coast',
    type: 'Coastal',
    length: '656 mi',
    difficulty: 'Easy–Moderate',
    bestSeason: 'Year-round',
    highlight: 'Dramatic sea cliffs from Malibu to Mendocino',
    lat: 35.70, lng: -121.30,
  },
  {
    name: 'Angeles Crest Highway',
    designation: 'CA-2',
    state: 'California',
    region: 'West Coast',
    type: 'Mountain',
    length: '66 mi',
    difficulty: 'Moderate',
    bestSeason: 'May–Nov',
    highlight: 'Switchbacks above 7,000 ft over Los Angeles',
    lat: 34.25, lng: -117.90,
  },
  {
    name: 'North Cascades Highway',
    designation: 'WA-20',
    state: 'Washington',
    region: 'West Coast',
    type: 'Mountain',
    length: '140 mi',
    difficulty: 'Moderate',
    bestSeason: 'Jun–Oct',
    highlight: 'Volcanic peaks and glacial valleys',
    lat: 48.50, lng: -120.70,
  },
  {
    name: 'Cascade Lakes Scenic Byway',
    designation: 'OR-46',
    state: 'Oregon',
    region: 'West Coast',
    type: 'Scenic',
    length: '66 mi',
    difficulty: 'Easy',
    bestSeason: 'Jul–Oct',
    highlight: 'Alpine lakes flanking the Cascades',
    lat: 43.90, lng: -121.70,
  },
  {
    name: 'Rim of the World Drive',
    designation: 'CA-18',
    state: 'California',
    region: 'West Coast',
    type: 'Mountain',
    length: '40 mi',
    difficulty: 'Moderate',
    bestSeason: 'Apr–Nov',
    highlight: 'Ridge-top drive over the San Bernardino mountains',
    lat: 34.17, lng: -117.05,
  },
  {
    name: 'Rogue–Umpqua Scenic Byway',
    designation: 'OR-62 / OR-230',
    state: 'Oregon',
    region: 'West Coast',
    type: 'Scenic',
    length: '172 mi',
    difficulty: 'Easy',
    bestSeason: 'May–Oct',
    highlight: 'Waterfalls, canyons, and Crater Lake approaches',
    lat: 43.20, lng: -122.90,
  },
  {
    name: 'Hana Highway',
    designation: 'HI-360',
    state: 'Hawaii',
    region: 'West Coast',
    type: 'Coastal',
    length: '64 mi',
    difficulty: 'Moderate',
    bestSeason: 'Year-round',
    highlight: '617 curves, 59 bridges, and lush Maui jungle',
    lat: 20.80, lng: -156.20,
  },
  {
    name: 'Seward Highway',
    designation: 'AK-1',
    state: 'Alaska',
    region: 'West Coast',
    type: 'Scenic',
    length: '127 mi',
    difficulty: 'Easy–Moderate',
    bestSeason: 'Jun–Sep',
    highlight: 'Fjords, glaciers, and bald eagles from Anchorage',
    lat: 60.40, lng: -149.40,
  },
  // ── Mountain West ────────────────────────────────────────────
  {
    name: 'Beartooth Highway',
    designation: 'US-212',
    state: 'Montana / Wyoming',
    region: 'Mountain West',
    type: 'Mountain',
    length: '68 mi',
    difficulty: 'Challenging',
    bestSeason: 'Jun–Sep',
    highlight: "America's most beautiful road — 10,947 ft summit",
    lat: 45.03, lng: -109.54,
  },
  {
    name: 'Going-to-the-Sun Road',
    designation: 'GTSR',
    state: 'Montana',
    region: 'Mountain West',
    type: 'Mountain',
    length: '50 mi',
    difficulty: 'Moderate',
    bestSeason: 'Jul–Sep',
    highlight: 'Glacier NP — narrow ledge road at Logan Pass',
    lat: 48.70, lng: -113.73,
  },
  {
    name: 'Million Dollar Highway',
    designation: 'US-550',
    state: 'Colorado',
    region: 'Mountain West',
    type: 'Mountain',
    length: '25 mi',
    difficulty: 'Very Challenging',
    bestSeason: 'Jun–Oct',
    highlight: 'No guardrails, sheer drops, three 11,000 ft passes',
    lat: 37.90, lng: -107.73,
  },
  {
    name: 'Trail Ridge Road',
    designation: 'US-34',
    state: 'Colorado',
    region: 'Mountain West',
    type: 'Mountain',
    length: '48 mi',
    difficulty: 'Moderate',
    bestSeason: 'Jun–Oct',
    highlight: 'Highest continuous paved road in the US at 12,183 ft',
    lat: 40.43, lng: -105.75,
  },
  {
    name: 'Chief Joseph Scenic Byway',
    designation: 'WY-296',
    state: 'Wyoming',
    region: 'Mountain West',
    type: 'Scenic',
    length: '46 mi',
    difficulty: 'Easy–Moderate',
    bestSeason: 'Jun–Oct',
    highlight: 'Dead Indian Pass and sweeping Absaroka views',
    lat: 44.70, lng: -109.60,
  },
  {
    name: 'Needles Highway',
    designation: 'SD-87',
    state: 'South Dakota',
    region: 'Mountain West',
    type: 'Mountain',
    length: '14 mi',
    difficulty: 'Moderate',
    bestSeason: 'May–Oct',
    highlight: 'Tunnels chiselled through granite spires',
    lat: 43.68, lng: -103.54,
  },
  {
    name: 'Iron Mountain Road',
    designation: 'SD-16A',
    state: 'South Dakota',
    region: 'Mountain West',
    type: 'Mountain',
    length: '17 mi',
    difficulty: 'Moderate',
    bestSeason: 'May–Oct',
    highlight: 'Pigtail bridges framing views of Mount Rushmore',
    lat: 43.85, lng: -103.44,
  },
  {
    name: 'Hells Canyon Scenic Byway',
    designation: 'ID-71',
    state: 'Idaho',
    region: 'Mountain West',
    type: 'Canyon',
    length: '218 mi',
    difficulty: 'Moderate',
    bestSeason: 'May–Oct',
    highlight: "North America's deepest river gorge",
    lat: 45.50, lng: -116.70,
  },
  {
    name: 'Lolo Pass Road',
    designation: 'US-12',
    state: 'Idaho / Montana',
    region: 'Mountain West',
    type: 'Mountain',
    length: '170 mi',
    difficulty: 'Moderate',
    bestSeason: 'May–Nov',
    highlight: 'Lewis & Clark route through the Bitterroot Range',
    lat: 46.60, lng: -114.60,
  },
  // ── Southwest ────────────────────────────────────────────────
  {
    name: 'Highway 12',
    designation: 'UT-12',
    state: 'Utah',
    region: 'Southwest',
    type: 'Scenic',
    length: '124 mi',
    difficulty: 'Moderate',
    bestSeason: 'Apr–Jun, Sep–Nov',
    highlight: "Bryce to Capitol Reef — arguably America's most beautiful road",
    lat: 37.77, lng: -111.56,
  },
  {
    name: 'Extraterrestrial Highway',
    designation: 'NV-375',
    state: 'Nevada',
    region: 'Southwest',
    type: 'Desert',
    length: '98 mi',
    difficulty: 'Easy',
    bestSeason: 'Sep–May',
    highlight: 'Dead-straight desert corridor past Area 51',
    lat: 37.50, lng: -115.37,
  },
  {
    name: 'Oak Creek Canyon',
    designation: 'AZ-89A',
    state: 'Arizona',
    region: 'Southwest',
    type: 'Canyon',
    length: '14 mi',
    difficulty: 'Moderate',
    bestSeason: 'Mar–Jun, Sep–Nov',
    highlight: 'Tight switchbacks dropping into a red-rock canyon',
    lat: 34.84, lng: -111.76,
  },
  {
    name: 'White Rim Road',
    designation: 'BLM Road',
    state: 'Utah',
    region: 'Southwest',
    type: 'Off-road',
    length: '100 mi',
    difficulty: 'Very Challenging',
    bestSeason: 'Mar–May, Sep–Oct',
    highlight: 'Canyonlands rim loop — 4WD required',
    lat: 38.18, lng: -109.88,
  },
  {
    name: 'Loneliest Road in America',
    designation: 'US-50',
    state: 'Nevada',
    region: 'Southwest',
    type: 'Desert',
    length: '287 mi',
    difficulty: 'Easy',
    bestSeason: 'Sep–May',
    highlight: 'Vast empty Nevada desert crossing 7 mountain ranges',
    lat: 39.50, lng: -117.00,
  },
  {
    name: 'Historic Route 66',
    designation: 'US-66',
    state: 'Various',
    region: 'Southwest',
    type: 'Historic',
    length: '2,278 mi',
    difficulty: 'Easy',
    bestSeason: 'Year-round',
    highlight: "The Mother Road — America's most iconic drive",
    lat: 35.10, lng: -106.60,
  },
  {
    name: 'Big Bend Ranch Road',
    designation: 'FM-170',
    state: 'Texas',
    region: 'Southwest',
    type: 'Desert',
    length: '50 mi',
    difficulty: 'Easy–Moderate',
    bestSeason: 'Oct–Apr',
    highlight: 'Remote Trans-Pecos canyon scenery along the Rio Grande',
    lat: 29.25, lng: -103.25,
  },
  {
    name: 'River Road',
    designation: 'TX-170',
    state: 'Texas',
    region: 'Southwest',
    type: 'Scenic',
    length: '56 mi',
    difficulty: 'Easy',
    bestSeason: 'Oct–Apr',
    highlight: 'Winding desert bluffs above the Rio Grande',
    lat: 29.50, lng: -104.60,
  },
  {
    name: 'Death Valley Scenic Loop',
    designation: 'CA-190 / Artist\'s Drive',
    state: 'California',
    region: 'Southwest',
    type: 'Desert',
    length: '25 mi',
    difficulty: 'Easy',
    bestSeason: 'Oct–Apr',
    highlight: 'Salt flats, sand dunes, and volcanic crater loop',
    lat: 36.50, lng: -117.13,
  },
  {
    name: 'Geronimo Trail',
    designation: 'NM-152',
    state: 'New Mexico',
    region: 'Southwest',
    type: 'Mountain',
    length: '52 mi',
    difficulty: 'Moderate',
    bestSeason: 'Apr–Nov',
    highlight: 'Emory Pass summit at 8,228 ft over the Black Range',
    lat: 32.90, lng: -107.60,
  },
  // ── Southeast ────────────────────────────────────────────────
  {
    name: 'Tail of the Dragon',
    designation: 'US-129',
    state: 'North Carolina / Tennessee',
    region: 'Southeast',
    type: 'Technical',
    length: '11 mi',
    difficulty: 'Very Challenging',
    bestSeason: 'Apr–Nov',
    highlight: '318 curves, zero intersections — the world-famous dragon',
    lat: 35.47, lng: -83.98,
  },
  {
    name: 'Blue Ridge Parkway',
    designation: 'BRP',
    state: 'Virginia / North Carolina',
    region: 'Southeast',
    type: 'Scenic',
    length: '469 mi',
    difficulty: 'Easy',
    bestSeason: 'Apr–Nov',
    highlight: "America's Favourite Drive — ridge-top beauty for 469 miles",
    lat: 36.08, lng: -79.50,
  },
  {
    name: 'Cherohala Skyway',
    designation: 'TN-165 / NC-143',
    state: 'Tennessee / North Carolina',
    region: 'Southeast',
    type: 'Scenic',
    length: '43 mi',
    difficulty: 'Moderate',
    bestSeason: 'Apr–Nov',
    highlight: 'High-altitude ridge cruising through Cherokee National Forest',
    lat: 35.38, lng: -84.20,
  },
  {
    name: 'Moonshiner 28',
    designation: 'NC-28',
    state: 'North Carolina',
    region: 'Southeast',
    type: 'Technical',
    length: '38 mi',
    difficulty: 'Challenging',
    bestSeason: 'Apr–Nov',
    highlight: 'Fast sweepers and elevation changes — Tail\'s secret sibling',
    lat: 35.27, lng: -83.42,
  },
  {
    name: 'Overseas Highway',
    designation: 'US-1',
    state: 'Florida',
    region: 'Southeast',
    type: 'Coastal',
    length: '113 mi',
    difficulty: 'Easy',
    bestSeason: 'Nov–Apr',
    highlight: '42 bridges connecting the Florida Keys to Key West',
    lat: 24.70, lng: -80.90,
  },
  {
    name: 'Natchez Trace Parkway',
    designation: 'NTP',
    state: 'Mississippi / Tennessee',
    region: 'Southeast',
    type: 'Historic',
    length: '444 mi',
    difficulty: 'Easy',
    bestSeason: 'Mar–May, Oct–Nov',
    highlight: 'Zero traffic lights, zero trucks — ancient American highway',
    lat: 34.70, lng: -87.70,
  },
  {
    name: 'Foothills Parkway',
    designation: 'FP',
    state: 'Tennessee',
    region: 'Southeast',
    type: 'Scenic',
    length: '72 mi',
    difficulty: 'Easy',
    bestSeason: 'Apr–Nov',
    highlight: 'Undiscovered Great Smoky Mountains ridge drive',
    lat: 35.65, lng: -83.85,
  },
  {
    name: 'Talimena Scenic Drive',
    designation: 'OK-1 / AR-88',
    state: 'Oklahoma / Arkansas',
    region: 'Southeast',
    type: 'Scenic',
    length: '54 mi',
    difficulty: 'Easy',
    bestSeason: 'Oct–Nov',
    highlight: 'Ouachita Mountain ridge with sweeping valley vistas',
    lat: 34.63, lng: -94.85,
  },
  // ── Northeast ────────────────────────────────────────────────
  {
    name: 'Kancamagus Highway',
    designation: 'NH-112',
    state: 'New Hampshire',
    region: 'Northeast',
    type: 'Scenic',
    length: '35 mi',
    difficulty: 'Easy',
    bestSeason: 'Sep–Oct',
    highlight: 'World-class fall foliage through White Mountain National Forest',
    lat: 44.05, lng: -71.40,
  },
  {
    name: 'Skyline Drive',
    designation: 'Shenandoah NP',
    state: 'Virginia',
    region: 'Northeast',
    type: 'Scenic',
    length: '105 mi',
    difficulty: 'Easy',
    bestSeason: 'May–Jun, Oct',
    highlight: '105 miles of ridge-top driving through Shenandoah NP',
    lat: 38.50, lng: -78.50,
  },
  {
    name: 'Vermont Route 100',
    designation: 'VT-100',
    state: 'Vermont',
    region: 'Northeast',
    type: 'Scenic',
    length: '216 mi',
    difficulty: 'Easy',
    bestSeason: 'Sep–Oct',
    highlight: 'Vermont spine road — covered bridges and peak fall colour',
    lat: 43.90, lng: -72.90,
  },
  {
    name: 'Mohawk Trail',
    designation: 'MA-2',
    state: 'Massachusetts',
    region: 'Northeast',
    type: 'Historic',
    length: '63 mi',
    difficulty: 'Easy–Moderate',
    bestSeason: 'Sep–Oct',
    highlight: "America's first scenic byway through the Berkshire highlands",
    lat: 42.67, lng: -73.00,
  },
  {
    name: 'Acadia Loop Road',
    designation: 'Park Loop Rd',
    state: 'Maine',
    region: 'Northeast',
    type: 'Coastal',
    length: '27 mi',
    difficulty: 'Easy',
    bestSeason: 'May–Oct',
    highlight: 'Rocky Atlantic coastline through Acadia National Park',
    lat: 44.32, lng: -68.22,
  },
  {
    name: 'Mount Washington Auto Road',
    designation: 'MWAR',
    state: 'New Hampshire',
    region: 'Northeast',
    type: 'Mountain',
    length: '7.6 mi',
    difficulty: 'Challenging',
    bestSeason: 'May–Oct',
    highlight: 'Steepest average grade of any auto road in the east — 6,288 ft summit',
    lat: 44.27, lng: -71.30,
  },
  // ── Midwest ──────────────────────────────────────────────────
  {
    name: 'Ozark Highlands Scenic Byway',
    designation: 'AR-7 / AR-21',
    state: 'Arkansas',
    region: 'Midwest',
    type: 'Scenic',
    length: '165 mi',
    difficulty: 'Moderate',
    bestSeason: 'Apr–Nov',
    highlight: 'Genuine switchbacks and technical bends through the Ozarks',
    lat: 35.75, lng: -93.40,
  },
  {
    name: 'Great River Road',
    designation: 'WI / MN scenic',
    state: 'Wisconsin / Minnesota',
    region: 'Midwest',
    type: 'Scenic',
    length: '250 mi',
    difficulty: 'Easy',
    bestSeason: 'May–Oct',
    highlight: 'Mississippi River bluffs, river towns, and bald eagles',
    lat: 44.00, lng: -91.50,
  },
  {
    name: 'Loess Hills Parkway',
    designation: 'IA-183',
    state: 'Iowa',
    region: 'Midwest',
    type: 'Scenic',
    length: '220 mi',
    difficulty: 'Easy',
    bestSeason: 'Apr–Nov',
    highlight: 'Rolling loess bluffs found only here and in China',
    lat: 42.05, lng: -96.05,
  },
  {
    name: 'Tunnel of Trees',
    designation: 'M-119',
    state: 'Michigan',
    region: 'Midwest',
    type: 'Scenic',
    length: '20 mi',
    difficulty: 'Easy',
    bestSeason: 'Sep–Oct',
    highlight: 'Canopy of hardwoods tunnels over Lake Michigan shoreline',
    lat: 45.45, lng: -85.00,
  },
];

// ── Map initialisation ─────────────────────────────────────────
const TILE_OSM   = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_URLS = { light: TILE_OSM, dark: TILE_DARK };
const ATTR_OSM   = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const ATTR_CARTO = ATTR_OSM + ' &copy; <a href="https://carto.com/">CARTO</a>';
const TILE_ATTR = ATTR_CARTO;

const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
const fullMap = L.map('fullMap', {
  center: [39.5, -98.35],
  zoom: 4,
  zoomControl: false,
  minZoom: 3,
  maxZoom: 17,
});
L.control.zoom({ position: 'bottomright' }).addTo(fullMap);

// Ensure Leaflet measures the container after layout has fully painted
function forceResize() { fullMap.invalidateSize({ pan: false }); }
setTimeout(forceResize, 50);
setTimeout(forceResize, 250);
setTimeout(forceResize, 600);
window.addEventListener('load', () => setTimeout(forceResize, 100));

function makeTileLayer(url, attr) {
  return L.tileLayer(url, { attribution: attr, maxZoom: 19 });
}

let tileLayer = makeTileLayer(
  TILE_URLS[currentTheme] || TILE_DARK,
  currentTheme === 'dark' ? ATTR_CARTO : ATTR_OSM,
).addTo(fullMap);

// Fall back to OSM if dark (CARTO) tiles fail to load
let _tileErrCount = 0;
tileLayer.on('tileerror', () => {
  _tileErrCount++;
  if (_tileErrCount === 4 && tileLayer._url !== TILE_OSM) {
    fullMap.removeLayer(tileLayer);
    tileLayer = makeTileLayer(TILE_OSM, ATTR_OSM).addTo(fullMap);
    _tileErrCount = 0;
  }
});

function updateMapTiles(theme) {
  fullMap.removeLayer(tileLayer);
  _tileErrCount = 0;
  tileLayer = makeTileLayer(
    TILE_URLS[theme] || TILE_DARK,
    theme === 'dark' ? ATTR_CARTO : ATTR_OSM,
  ).addTo(fullMap);
  tileLayer.on('tileerror', () => {
    _tileErrCount++;
    if (_tileErrCount === 4 && tileLayer._url !== TILE_OSM) {
      fullMap.removeLayer(tileLayer);
      tileLayer = makeTileLayer(TILE_OSM, ATTR_OSM).addTo(fullMap);
      _tileErrCount = 0;
    }
  });
}

// ── Markers ────────────────────────────────────────────────────
const markersByIndex = {};

function makeMarkerIcon(color) {
  return L.divIcon({
    className: 'atlas-road-marker',
    html: `<div class="atlas-road-marker-inner" style="background:${color};box-shadow:0 2px 8px rgba(0,0,0,.4),0 0 8px ${color}55;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -12],
  });
}

// ── Route Builder state (declared here so buildPopupHTML can ref it) ──
let routeRoads = []; // array of road names

// ── Weather (Open-Meteo, no API key) ──────────────────────────
const WMO_CODES = {
  0:'Clear sky', 1:'Mainly clear', 2:'Partly cloudy', 3:'Overcast',
  45:'Fog', 48:'Icy fog',
  51:'Light drizzle', 53:'Drizzle', 55:'Heavy drizzle',
  61:'Light rain', 63:'Rain', 65:'Heavy rain',
  71:'Light snow', 73:'Snow', 75:'Heavy snow', 77:'Snow grains',
  80:'Rain showers', 81:'Heavy showers', 82:'Violent showers',
  85:'Snow showers', 86:'Heavy snow showers',
  95:'Thunderstorm', 96:'Thunderstorm + hail', 99:'Thunderstorm + heavy hail',
};

const CONDITION_ICONS = {
  Snow:'❄️', Ice:'🧊', Construction:'🚧', Flooding:'🌊',
  Rockslide:'⛰️', Closure:'🚫', Clear:'✅',
};

async function fetchWeather(lat, lng) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m,precipitation&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('weather fetch failed');
  return res.json();
}

function _safeRoadName(name) { return name.replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }

function buildPopupHTML(road) {
  const color   = TYPE_COLORS[road.type] || '#888';
  const driven  = _drivenSet.has(road.name);
  const saved   = _savedSet.has(road.name);
  const roadIdx = ROADS.findIndex(r => r.name === road.name);
  const inRoute = routeRoads.includes(road.name);
  const n       = _safeRoadName(road.name);

  const rating = road.avgRating > 0
    ? `<span class="road-popup-rating">★ ${parseFloat(road.avgRating).toFixed(1)} <em>(${road.reviewCount})</em></span>`
    : '';

  const bt = TYPE_BEST_TIME[road.type];
  const bestTime = bt ? `
    <div class="road-popup-best-time">
      <span class="bt-icon">🕐</span>
      <div><span class="bt-best">${bt.best}</span><span class="bt-avoid">Avoid: ${bt.avoid}</span></div>
    </div>` : '';

  const reportBtn = road.id
    ? `<button class="road-popup-report" onclick="openReportCondition(${road.id},'${n}')">+ Report condition</button>`
    : '';

  const photoId = road.id ? `road-photos-${road.id}` : `road-photos-static`;
  const onClickPhotos = `openPhotoGallery('${n}',${road.id || 'null'})`;

  return `
    <div class="road-popup">
      <div class="road-popup-name">${road.name}</div>
      <div class="road-popup-desig">${road.designation} &middot; ${road.state}</div>
      <div class="road-popup-badges">
        <span class="road-popup-badge" style="background:${color}">${road.type}</span>
        <span class="road-popup-badge" style="background:#374151">${road.region}</span>
        <span class="road-popup-badge" style="background:#1f2937">${TYPE_CHARACTER[road.type] || 'Mixed'}</span>
      </div>
      ${rating}
      <div class="road-popup-row">
        <span class="road-popup-stat"><strong>${road.length}</strong></span>
        <span class="road-popup-stat">${road.difficulty}</span>
        <span class="road-popup-stat">${road.bestSeason}</span>
      </div>
      ${bestTime}
      <div class="road-popup-weather" data-lat="${road.lat}" data-lng="${road.lng}">
        <span class="weather-loading">Loading weather…</span>
      </div>
      <div class="road-popup-alerts">
        <div class="alerts-row">
          <span class="alerts-label">Road alerts</span>
          ${reportBtn}
        </div>
        <div class="alerts-list" data-road-id="${road.id || ''}">
          <span class="alerts-loading">Checking…</span>
        </div>
      </div>
      <div class="popup-action-row">
        <button class="popup-btn popup-driven-btn${driven ? ' active' : ''}"
          onclick="handleDriven('${n}',this)" title="${driven ? 'Remove from log' : 'Mark as driven'}">
          ${driven ? '✓ Driven' : '+ Log Drive'}
        </button>
        <button class="popup-btn popup-save-btn${saved ? ' active' : ''}"
          onclick="handleBucket('${n}',this)" title="${saved ? 'Remove from bucket list' : 'Add to bucket list'}">
          ${saved ? '★ Saved' : '☆ Bucket List'}
        </button>
        <button class="popup-btn popup-route-btn${inRoute ? ' active' : ''}"
          onclick="toggleRouteRoad('${n}',this)" title="${inRoute ? 'Remove from route' : 'Add to route'}">
          ${inRoute ? '🗺 In Route' : '+ Route'}
        </button>
      </div>
      <button class="popup-photos-btn" onclick="${onClickPhotos}">
        📷 <span id="${photoId}">Photos</span>
      </button>
    </div>
  `;
}

// Populate weather + conditions after popup opens
function attachPopupDataLoader(marker, road) {
  marker.on('popupopen', async () => {
    const popup   = marker.getPopup();
    const el      = popup.getElement();
    if (!el) return;

    const weatherEl    = el.querySelector('.road-popup-weather');
    const alertsEl     = el.querySelector('.alerts-list');

    // Weather
    if (weatherEl) {
      try {
        const data = await fetchWeather(road.lat, road.lng);
        const c    = data.current;
        const desc = WMO_CODES[c.weather_code] || 'Unknown';
        const precip = c.precipitation > 0 ? ` &middot; ${c.precipitation}" precip` : '';
        weatherEl.innerHTML = `
          <span class="weather-temp">${Math.round(c.temperature_2m)}°F</span>
          <span class="weather-desc">${desc}</span>
          <span class="weather-wind">💨 ${Math.round(c.wind_speed_10m)} mph${precip}</span>
        `;
      } catch {
        weatherEl.innerHTML = '<span class="weather-na">Weather unavailable</span>';
      }
      popup.update();
    }

    // Road conditions from Supabase
    if (alertsEl) {
      try {
        const conds = (road.id && typeof getConditions === 'function')
          ? await getConditions(road.id)
          : [];
        if (!conds.length) {
          alertsEl.innerHTML = '<span class="alerts-none">No active alerts</span>';
        } else {
          alertsEl.innerHTML = conds.map(c =>
            `<span class="alert-tag alert-${c.condition_type.toLowerCase()}">${CONDITION_ICONS[c.condition_type] || ''} ${c.condition_type}</span>`
          ).join('');
        }
      } catch {
        alertsEl.innerHTML = '<span class="alerts-none">No active alerts</span>';
      }
      popup.update();
    }
  });
}

async function handleSave(roadId, btn) {
  if (!window.__atlasUser) {
    document.getElementById('authBtn')?.click();
    return;
  }
  try {
    btn.disabled = true;
    await toggleSave(window.__atlasUser.id, roadId);
  } catch { /* silent */ } finally {
    btn.disabled = false;
  }
}

// ── Drive Log ─────────────────────────────────────────────────
function handleDriven(roadName, btn) {
  const road = ROADS.find(r => r.name === roadName);
  if (_drivenSet.has(roadName)) {
    _drivenSet.delete(roadName);
    delete _drivenMeta[roadName];
    btn.textContent = '+ Log Drive';
    btn.classList.remove('active');
  } else {
    _drivenSet.add(roadName);
    _drivenMeta[roadName] = {
      type:   road?.type   || '',
      region: road?.region || '',
      miles:  road ? parseFloat(road.length) || 0 : 0,
    };
    btn.textContent = '✓ Driven';
    btn.classList.add('active');
  }
  _persistDriven();
  // Sync to Supabase if possible
  if (window.__atlasUser && road?.id) {
    if (_drivenSet.has(roadName)) markRoadDriven(window.__atlasUser.id, road.id).catch(() => {});
    else unmarkRoadDriven(window.__atlasUser.id, road.id).catch(() => {});
  }
}

function handleBucket(roadName, btn) {
  if (_savedSet.has(roadName)) {
    _savedSet.delete(roadName);
    btn.textContent = '☆ Bucket List';
    btn.classList.remove('active');
  } else {
    _savedSet.add(roadName);
    btn.textContent = '★ Saved';
    btn.classList.add('active');
  }
  _persistSaved();
}

// ── Route Builder ─────────────────────────────────────────────
function toggleRouteRoad(roadName, btn) {
  if (routeRoads.includes(roadName)) {
    routeRoads = routeRoads.filter(n => n !== roadName);
    btn.textContent = '+ Route';
    btn.classList.remove('active');
  } else {
    routeRoads.push(roadName);
    btn.textContent = '🗺 In Route';
    btn.classList.add('active');
  }
  renderRouteBuilder();
}

function renderRouteBuilder() {
  const panel = document.getElementById('routeBuilderPanel');
  if (!panel) return;
  if (!routeRoads.length) { panel.style.display = 'none'; return; }
  panel.style.display = '';

  document.getElementById('routeStopCount').textContent = routeRoads.length;

  // Total road miles + travel between them
  let travelMi = 0;
  let driveMi  = 0;
  routeRoads.forEach((name, i) => {
    const road = ROADS.find(r => r.name === name);
    if (!road) return;
    driveMi += parseFloat(road.length) || 0;
    if (i > 0) {
      const prev = ROADS.find(r => r.name === routeRoads[i - 1]);
      if (prev) travelMi += haversine(prev.lat, prev.lng, road.lat, road.lng);
    }
  });
  const total = Math.round(driveMi + travelMi);
  document.getElementById('routeTotalDist').textContent = `~${total} mi`;

  document.getElementById('routeBuilderList').innerHTML = routeRoads.map((name, i) => {
    const road = ROADS.find(r => r.name === name);
    const color = road ? (TYPE_COLORS[road.type] || '#888') : '#888';
    return `
      <div class="route-stop">
        <span class="route-stop-num">${i + 1}</span>
        <span class="route-stop-dot" style="background:${color}"></span>
        <span class="route-stop-name">${name}</span>
        <button class="route-stop-remove" onclick="removeRouteStop('${_safeRoadName(name)}')">×</button>
      </div>`;
  }).join('');
}

function removeRouteStop(roadName) {
  routeRoads = routeRoads.filter(n => n !== roadName);
  // Re-open popup if it's for this road to update button state
  fullMap.eachLayer(l => {
    if (l.getPopup && l.getPopup()?.isOpen()) {
      const road = ROADS.find(r => r.name === roadName);
      if (road) {
        const idx = ROADS.indexOf(road);
        if (markersByIndex[idx]) markersByIndex[idx].setPopupContent(buildPopupHTML(road));
      }
    }
  });
  renderRouteBuilder();
}

function shareRoute() {
  if (!routeRoads.length) return;
  const url = new URL(window.location.href);
  url.searchParams.set('route', routeRoads.join('|'));
  navigator.clipboard?.writeText(url.toString()).then(() => showToast('Link copied!')).catch(() => {
    prompt('Copy this route link:', url.toString());
  });
}

function showToast(msg) {
  const t = document.getElementById('shareToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 2200);
}

function loadRouteFromURL() {
  const param = new URLSearchParams(window.location.search).get('route');
  if (!param) return;
  const names = param.split('|').filter(Boolean);
  names.forEach(name => {
    const road = ROADS.find(r => r.name === name);
    if (road) routeRoads.push(road.name);
  });
  if (routeRoads.length) renderRouteBuilder();
}

// ── Featured Road of the Week ─────────────────────────────────
function renderFeaturedRoad() {
  const el = document.getElementById('featuredRoadCard');
  if (!el || !ROADS.length) return;
  const weekNum  = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
  const road     = ROADS[weekNum % ROADS.length];
  const color    = TYPE_COLORS[road.type] || '#888';
  const idx      = ROADS.indexOf(road);
  el.innerHTML = `
    <div class="featured-label">⭐ Road of the Week</div>
    <div class="featured-name">${road.name}</div>
    <div class="featured-sub">${road.designation} · ${road.state}</div>
    <div class="featured-badges">
      <span class="featured-badge" style="background:${color}">${road.type}</span>
      <span class="featured-badge" style="background:#374151">${road.difficulty}</span>
    </div>
    ${road.highlight ? `<div class="featured-highlight">"${road.highlight}"</div>` : ''}
    <button class="featured-view-btn" onclick="flyToRoad(${idx})">View on Map →</button>
  `;
}

// ── Photo Gallery ─────────────────────────────────────────────
let _photoRoadId   = null;
let _photoRoadName = null;

async function openPhotoGallery(roadName, roadId) {
  _photoRoadName = roadName;
  _photoRoadId   = roadId;

  const overlay = document.getElementById('photoGalleryOverlay');
  const title   = document.getElementById('photoGalleryTitle');
  const grid    = document.getElementById('photoGalleryGrid');
  const empty   = document.getElementById('photoGalleryEmpty');
  if (!overlay) return;

  title.textContent = roadName;
  grid.innerHTML = '<div class="feed-loading"><div class="feed-loading-spin"></div>Loading…</div>';
  empty.style.display = 'none';
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  if (!roadId) {
    grid.innerHTML = '';
    empty.textContent = 'Photos are available for community-submitted roads. Sign in and submit this road to add photos.';
    empty.style.display = '';
    return;
  }

  try {
    const photos = typeof getRoadPhotos === 'function' ? await getRoadPhotos(roadId) : [];
    if (!photos.length) {
      grid.innerHTML = '';
      empty.textContent = 'No photos yet — be the first to add one!';
      empty.style.display = '';
    } else {
      empty.style.display = 'none';
      grid.innerHTML = photos.map(p => {
        const user = p.profiles?.full_name || p.profiles?.username || 'Driver';
        return `<div class="photo-thumb">
          <img src="${p.photo_url}" alt="road photo" loading="lazy" />
          <div class="photo-thumb-credit">${user}</div>
        </div>`;
      }).join('');
    }
    // Update photo count button in popup
    const countEl = document.getElementById(`road-photos-${roadId}`);
    if (countEl) countEl.textContent = photos.length ? `${photos.length} Photos` : 'Photos';
  } catch {
    grid.innerHTML = '';
    empty.textContent = 'Could not load photos.';
    empty.style.display = '';
  }
}

function closePhotoGallery() {
  document.getElementById('photoGalleryOverlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('photoGalleryClose')?.addEventListener('click', closePhotoGallery);
document.getElementById('photoGalleryOverlay')?.addEventListener('click', e => {
  if (e.target === document.getElementById('photoGalleryOverlay')) closePhotoGallery();
});

document.getElementById('photoUploadBtn')?.addEventListener('click', () => {
  if (!window.__atlasUser) { document.getElementById('authBtn')?.click(); return; }
  document.getElementById('photoFileInput')?.click();
});

document.getElementById('photoFileInput')?.addEventListener('change', async function () {
  const file = this.files?.[0];
  if (!file || !_photoRoadId || !window.__atlasUser) return;
  this.value = '';
  const btn = document.getElementById('photoUploadBtn');
  btn.disabled = true;
  btn.textContent = 'Uploading…';
  try {
    await addRoadPhoto(window.__atlasUser.id, _photoRoadId, file);
    openPhotoGallery(_photoRoadName, _photoRoadId); // refresh
  } catch (e) {
    alert('Upload failed: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '+ Add Photo';
  }
});

ROADS.forEach((road, i) => {
  const color = TYPE_COLORS[road.type] || '#888';
  const marker = L.marker([road.lat, road.lng], { icon: makeMarkerIcon(color) })
    .bindPopup(buildPopupHTML(road), { maxWidth: 280, maxHeight: 420 })
    .addTo(fullMap);

  marker.on('click', () => highlightListItem(i));
  attachPopupDataLoader(marker, road);
  markersByIndex[i] = marker;
});

// ── Sidebar ────────────────────────────────────────────────────
const sidebar       = document.getElementById('mapSidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarClose  = document.getElementById('sidebarClose');

sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
sidebarClose.addEventListener('click', () => sidebar.classList.remove('open'));

// ── Road list rendering ────────────────────────────────────────
const roadList     = document.getElementById('roadList');
const roadCount    = document.getElementById('roadCount');
const visibleCount = document.getElementById('visibleCount');
const resetBtn     = document.getElementById('resetFilters');

let filteredRoads   = [...ROADS];
let activeItem      = null;
let searchQuery     = '';
let regionFilter    = '';
let typeFilter      = '';
let characterFilter = '';

// ── Location & Near Me ─────────────────────────────────────────
let userLat = null, userLng = null;
let userMarker  = null;
let routeLayer  = null;
let nearMeActive = false;

const nearMeBtn  = document.getElementById('nearMeBtn');
const routePanel = document.getElementById('routePanel');
const closeRoute = document.getElementById('closeRoute');

function haversine(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const NEAR_ME_ICON_HTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>`;

// ── Shared: set user location and update UI ────────────────────
function setUserLocation(lat, lng, label) {
  userLat = lat;
  userLng = lng;
  nearMeActive = true;

  if (userMarker) fullMap.removeLayer(userMarker);
  const userIcon = L.divIcon({
    className: 'user-location-marker',
    html: '<div class="user-location-pulse"></div><div class="user-location-dot"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
  userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(fullMap);
  fullMap.flyTo([lat, lng], 7, { duration: 1.5 });

  nearMeBtn.classList.add('active');
  nearMeBtn.innerHTML = `${NEAR_ME_ICON_HTML} Using: ${label}`;

  renderList();
}

function clearUserLocation() {
  nearMeActive = false;
  userLat = userLng = null;
  if (userMarker) { fullMap.removeLayer(userMarker); userMarker = null; }
  if (routeLayer) { fullMap.removeLayer(routeLayer); routeLayer = null; }
  routePanel.classList.remove('open');
  nearMeBtn.classList.remove('active');
  nearMeBtn.innerHTML = `${NEAR_ME_ICON_HTML} Use My Location`;
  setLocationStatus('');
  const locInput = document.getElementById('locationInput');
  if (locInput) locInput.value = '';
  renderList();
}

function setLocationStatus(msg, type = '') {
  const el = document.getElementById('locationStatus');
  if (!el) return;
  el.textContent = msg;
  el.className = 'location-status' + (type ? ` ${type}` : '');
}

// ── Geocode a text query via Nominatim ─────────────────────────
async function geocodeQuery(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('Geocoding service unavailable');
  const data = await res.json();
  if (!data.length) throw new Error(`"${query}" not found — try a city name`);
  const { lat, lon, display_name } = data[0];
  const label = display_name.split(',').slice(0, 2).join(',').trim();
  return { lat: parseFloat(lat), lng: parseFloat(lon), label };
}

// ── Location text input ────────────────────────────────────────
const locationForm  = document.getElementById('locationForm');
const locationInput = document.getElementById('locationInput');

locationForm.addEventListener('submit', async e => {
  e.preventDefault();
  const query = locationInput.value.trim();
  if (!query) return;

  const goBtn = document.getElementById('locationGoBtn');
  goBtn.disabled = true;
  setLocationStatus('Searching…');

  try {
    const { lat, lng, label } = await geocodeQuery(query);
    setLocationStatus(label, 'success');
    setUserLocation(lat, lng, label.split(',')[0]);
  } catch (err) {
    setLocationStatus(err.message, 'error');
  } finally {
    goBtn.disabled = false;
  }
});

// ── Near Me (geolocation) ──────────────────────────────────────
nearMeBtn.addEventListener('click', () => {
  if (nearMeActive) {
    clearUserLocation();
    return;
  }

  if (!navigator.geolocation) {
    setLocationStatus('Geolocation not supported by your browser.', 'error');
    return;
  }

  nearMeBtn.innerHTML = 'Locating…';
  nearMeBtn.disabled = true;
  setLocationStatus('Getting your location…');

  navigator.geolocation.getCurrentPosition(pos => {
    nearMeBtn.disabled = false;
    setUserLocation(pos.coords.latitude, pos.coords.longitude, 'My Location');
    setLocationStatus('Showing roads nearest to you', 'success');
  }, err => {
    nearMeBtn.disabled = false;
    nearMeBtn.innerHTML = `${NEAR_ME_ICON_HTML} Use My Location`;
    const msg = err.code === 1
      ? 'Location denied — allow access in browser settings, or type your city above.'
      : err.code === 2
      ? 'Location unavailable. Try typing your city above.'
      : 'Location timed out. Try typing your city above.';
    setLocationStatus(msg, 'error');
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
});

async function getDirections(idx, e) {
  e.stopPropagation();
  if (!userLat || !userLng) return;
  const road = ROADS[idx];

  document.getElementById('routeDestName').textContent = road.name;
  document.getElementById('routeDist').textContent = '…';
  document.getElementById('routeTime').textContent = '…';
  document.getElementById('openGMaps').href =
    `https://www.google.com/maps/dir/${userLat},${userLng}/${road.lat},${road.lng}`;
  routePanel.classList.add('open');

  if (routeLayer) { fullMap.removeLayer(routeLayer); routeLayer = null; }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    const url = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${road.lng},${road.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes.length) throw new Error('no route');

    const route  = data.routes[0];
    const distMi = (route.distance / 1609.34).toFixed(1);
    const mins   = Math.round(route.duration / 60);
    const hrs    = Math.floor(mins / 60);
    document.getElementById('routeDist').textContent = `${distMi} mi`;
    document.getElementById('routeTime').textContent = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins} min`;

    const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    routeLayer = L.polyline(coords, { color: '#ef4444', weight: 5, opacity: 0.85 }).addTo(fullMap);
    fullMap.fitBounds(routeLayer.getBounds(), { padding: [70, 70] });
  } catch {
    // Show straight-line distance as fallback; Google Maps link is still usable
    const asMiles = haversine(userLat, userLng, road.lat, road.lng);
    document.getElementById('routeDist').textContent = `~${Math.round(asMiles)} mi`;
    document.getElementById('routeTime').textContent = 'See Maps ↗';
  }
}

closeRoute.addEventListener('click', () => {
  routePanel.classList.remove('open');
  if (routeLayer) { fullMap.removeLayer(routeLayer); routeLayer = null; }
});

function renderList() {
  let results = ROADS
    .map((road, idx) => ({ road, idx }))
    .filter(({ road }) => {
      const matchSearch = !searchQuery ||
        road.name.toLowerCase().includes(searchQuery) ||
        road.state.toLowerCase().includes(searchQuery) ||
        road.type.toLowerCase().includes(searchQuery) ||
        road.designation.toLowerCase().includes(searchQuery);
      const matchRegion    = !regionFilter    || road.region === regionFilter;
      const matchType      = !typeFilter      || road.type   === typeFilter;
      const roadCharacter  = TYPE_CHARACTER[road.type] || 'Mixed';
      const matchCharacter = !characterFilter ||
        characterFilter === roadCharacter ||
        (characterFilter === 'Curves'       && roadCharacter === 'Curves') ||
        (characterFilter === 'Straightaways' && roadCharacter === 'Straightaways');
      return matchSearch && matchRegion && matchType && matchCharacter;
    });

  // When a location is set, attach distance and sort nearest first
  if (userLat !== null) {
    results = results
      .map(r => ({ ...r, dist: haversine(userLat, userLng, r.road.lat, r.road.lng) }))
      .sort((a, b) => a.dist - b.dist);
  }

  const hasFilter = searchQuery || regionFilter || typeFilter || characterFilter;
  resetBtn.style.display = hasFilter ? 'block' : 'none';

  roadCount.textContent = `${results.length} road${results.length !== 1 ? 's' : ''}`;
  visibleCount.textContent = `${results.length} road${results.length !== 1 ? 's' : ''} shown`;

  const visibleIdx = new Set(results.map(r => r.idx));
  Object.entries(markersByIndex).forEach(([i, marker]) => {
    const el = marker.getElement();
    if (el) el.style.opacity = visibleIdx.has(parseInt(i)) ? '1' : '0.15';
  });

  if (!results.length) {
    roadList.innerHTML = `<div class="road-list-empty">No roads match your search. <button onclick="resetAll()" style="color:var(--color-primary);font-weight:700;text-decoration:underline;">Reset filters</button></div>`;
    return;
  }

  roadList.innerHTML = '';
  results.forEach(({ road, idx, dist }) => {
    const color = TYPE_COLORS[road.type] || '#888';
    const item  = document.createElement('div');
    item.className = 'road-item';
    item.dataset.idx = idx;

    const distHTML = (dist != null)
      ? `<div class="road-item-dist">${dist < 10 ? dist.toFixed(1) : Math.round(dist)} mi away</div>`
      : '';
    const dirBtn = (dist != null)
      ? `<button class="road-item-dir-btn">Directions</button>`
      : '';

    item.innerHTML = `
      <div class="road-type-dot" style="background:${color};color:${color}"></div>
      <div class="road-item-info">
        <div class="road-item-name">${road.name}</div>
        <div class="road-item-meta">${road.designation} &middot; ${road.state}</div>
      </div>
      <div class="road-item-actions">
        <div class="road-item-length">${road.length}</div>
        ${distHTML}
        ${dirBtn}
      </div>
    `;

    item.addEventListener('click', () => flyToRoad(idx));
    if (userLat !== null) {
      const btn = item.querySelector('.road-item-dir-btn');
      if (btn) btn.addEventListener('click', e => getDirections(idx, e));
    }
    roadList.appendChild(item);
  });
}

function flyToRoad(idx) {
  const road = ROADS[idx];
  fullMap.flyTo([road.lat, road.lng], 9, { duration: 1.2 });
  markersByIndex[idx].openPopup();
  highlightListItem(idx);
  // On mobile, close sidebar
  if (window.innerWidth <= 1024) sidebar.classList.remove('open');
}

function highlightListItem(idx) {
  if (activeItem) activeItem.classList.remove('active');
  const el = roadList.querySelector(`[data-idx="${idx}"]`);
  if (el) {
    el.classList.add('active');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    activeItem = el;
  }
}

// ── Filters ────────────────────────────────────────────────────
const sidebarSearch = document.getElementById('sidebarSearch');
const searchClear   = document.getElementById('searchClear');

sidebarSearch.addEventListener('input', () => {
  searchQuery = sidebarSearch.value.trim().toLowerCase();
  searchClear.style.display = searchQuery ? 'flex' : 'none';
  renderList();
});
searchClear.addEventListener('click', () => {
  sidebarSearch.value = '';
  searchQuery = '';
  searchClear.style.display = 'none';
  sidebarSearch.focus();
  renderList();
});

document.querySelectorAll('#regionFilter .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#regionFilter .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    regionFilter = chip.dataset.value;
    renderList();
  });
});

document.querySelectorAll('#typeFilter .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#typeFilter .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    typeFilter = chip.dataset.value;
    renderList();
  });
});

document.querySelectorAll('#characterFilter .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#characterFilter .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    characterFilter = chip.dataset.value;
    renderList();
  });
});

function resetAll() {
  searchQuery     = '';
  regionFilter    = '';
  typeFilter      = '';
  characterFilter = '';
  sidebarSearch.value = '';
  searchClear.style.display = 'none';
  document.querySelectorAll('#regionFilter .chip').forEach((c, i) => c.classList.toggle('active', i === 0));
  document.querySelectorAll('#typeFilter .chip').forEach((c, i) => c.classList.toggle('active', i === 0));
  document.querySelectorAll('#characterFilter .chip').forEach((c, i) => c.classList.toggle('active', i === 0));
  renderList();
}
resetBtn.addEventListener('click', resetAll);

// ── Initial render ─────────────────────────────────────────────
renderList();
renderFeaturedRoad();
loadRouteFromURL();

document.getElementById('shareRouteBtn')?.addEventListener('click', shareRoute);
document.getElementById('clearRouteBtn')?.addEventListener('click', () => {
  routeRoads = [];
  renderRouteBuilder();
  // Refresh any open popup
  fullMap.eachLayer(l => { if (l.getPopup?.()?.isOpen()) l.closePopup(); });
});

// ── Deep-link: fly to road from URL params ─────────────────────
let _pendingURLRoad = null;
(function parseURLParams() {
  const params = new URLSearchParams(window.location.search);
  const roadParam = params.get('road');
  const lat = parseFloat(params.get('lat'));
  const lng = parseFloat(params.get('lng'));
  if (!roadParam && isNaN(lat)) return;
  _pendingURLRoad = { name: decodeURIComponent(roadParam || ''), lat, lng };
})();

function resolveURLRoad() {
  if (!_pendingURLRoad) return;
  const { name, lat, lng } = _pendingURLRoad;
  _pendingURLRoad = null;
  const idx = ROADS.findIndex(r => r.name.toLowerCase() === name.toLowerCase());
  if (idx !== -1) {
    flyToRoad(idx);
  } else if (!isNaN(lat) && !isNaN(lng)) {
    fullMap.flyTo([lat, lng], 9, { duration: 1.2 });
  }
}

// Fallback: run with static data if Supabase hasn't resolved in 1.5s
setTimeout(() => { if (_pendingURLRoad) resolveURLRoad(); }, 1500);

// ── Condition Report Modal ─────────────────────────────────────
const reportOverlay  = document.getElementById('reportOverlay');
const reportRoadName = document.getElementById('reportRoadName');
const reportForm     = document.getElementById('reportForm');
const reportClose    = document.getElementById('reportClose');
const reportError    = document.getElementById('reportError');
let   reportingRoadId = null;

function openReportCondition(roadId, roadName) {
  if (!window.__atlasUser) {
    document.getElementById('authBtn') && document.getElementById('authBtn').click();
    return;
  }
  reportingRoadId = roadId;
  if (reportRoadName) reportRoadName.textContent = roadName;
  if (reportOverlay) {
    reportOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

reportClose && reportClose.addEventListener('click', () => {
  reportOverlay.classList.remove('open');
  document.body.style.overflow = '';
  reportForm && reportForm.reset();
  if (reportError) reportError.textContent = '';
});

reportOverlay && reportOverlay.addEventListener('click', e => {
  if (e.target === reportOverlay) reportClose.click();
});

reportForm && reportForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!reportingRoadId || !window.__atlasUser) return;
  const btn = reportForm.querySelector('button[type="submit"]');
  const conditionType = reportForm.querySelector('[name="condition_type"]').value;
  const description   = reportForm.querySelector('[name="description"]').value.trim();
  btn.disabled = true;
  btn.textContent = 'Submitting…';
  try {
    await reportCondition({
      roadId:        reportingRoadId,
      userId:        window.__atlasUser.id,
      conditionType,
      description,
    });
    reportOverlay.classList.remove('open');
    document.body.style.overflow = '';
    reportForm.reset();
    // Close any open popups so user sees the update when they reopen
    fullMap.closePopup();
  } catch (err) {
    if (reportError) reportError.textContent = 'Failed to submit. Please try again.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit Report';
  }
});

// ── Supabase: load live road data if configured ────────────────
(async () => {
  // Skip if config.js has placeholder credentials
  if (typeof db === 'undefined' || typeof SUPABASE_URL === 'undefined' || SUPABASE_URL.includes('YOUR_PROJECT_ID')) return;

  try {
    const liveRoads = await getRoads();
    if (!liveRoads || !liveRoads.length) return;

    // Clear existing static markers
    Object.values(markersByIndex).forEach(m => fullMap.removeLayer(m));
    Object.keys(markersByIndex).forEach(k => delete markersByIndex[k]);

    // Re-populate ROADS with live data (normalise field names)
    ROADS.length = 0;
    liveRoads.forEach((r, i) => {
      ROADS.push({
        name:       r.name,
        designation: r.designation || '',
        state:      r.state,
        region:     r.region,
        type:       r.type,
        length:     r.length_mi ? `${r.length_mi} mi` : '—',
        difficulty: r.difficulty || '—',
        bestSeason: r.best_season || '—',
        highlight:  r.highlight || '',
        lat:        r.lat,
        lng:        r.lng,
        id:         r.id,
        avgRating:  r.avg_rating,
        reviewCount: r.review_count,
      });

      const color = TYPE_COLORS[r.type] || '#888';
      const marker = L.marker([r.lat, r.lng], { icon: makeMarkerIcon(color) })
        .bindPopup(buildPopupHTML(ROADS[i]), { maxWidth: 280, maxHeight: 420 })
        .addTo(fullMap);

      marker.on('click', () => highlightListItem(i));
      attachPopupDataLoader(marker, ROADS[i]);
      markersByIndex[i] = marker;
    });

    renderList();
    resolveURLRoad(); // resolve deep-link now that live data is ready
  } catch (err) {
    // Stay on static data silently
    console.warn('Atlas: could not load roads from Supabase, using static data.', err);
  }
})();

// ── Supabase: save road toggle ────────────────────────────────
document.addEventListener('atlas:authchange', ({ detail: { user } }) => {
  window.__atlasUser = user;
});

// ── Submit a Road ──────────────────────────────────────────────
const submitRoadBtn     = document.getElementById('submitRoadBtn');
const submitRoadOverlay = document.getElementById('submitRoadOverlay');
const submitRoadClose   = document.getElementById('submitRoadClose');
const submitRoadForm    = document.getElementById('submitRoadForm');
const submitRoadError   = document.getElementById('submitRoadError');
const pickMapBtn        = document.getElementById('pickMapBtn');
const mapPickHint       = document.getElementById('mapPickHint');
const cancelPick        = document.getElementById('cancelPick');
let   pickMarker        = null;
let   pickingLocation   = false;

submitRoadBtn.addEventListener('click', () => {
  submitRoadOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
});

function closeSubmitRoad() {
  submitRoadOverlay.classList.remove('open');
  document.body.style.overflow = '';
  submitRoadError.textContent = '';
  stopPickingLocation();
}

submitRoadClose.addEventListener('click', closeSubmitRoad);
submitRoadOverlay.addEventListener('click', e => { if (e.target === submitRoadOverlay) closeSubmitRoad(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && submitRoadOverlay.classList.contains('open')) closeSubmitRoad();
});

// ── Map pin placement ──────────────────────────────────────────
function stopPickingLocation() {
  pickingLocation = false;
  mapPickHint.classList.remove('active');
  fullMap.getContainer().style.cursor = '';
}

pickMapBtn.addEventListener('click', () => {
  pickingLocation = true;
  submitRoadOverlay.classList.remove('open'); // hide modal so map is usable
  mapPickHint.classList.add('active');
  fullMap.getContainer().style.cursor = 'crosshair';
});

cancelPick.addEventListener('click', () => {
  stopPickingLocation();
  submitRoadOverlay.classList.add('open');
});

fullMap.on('click', e => {
  if (!pickingLocation) return;
  stopPickingLocation();

  const { lat, lng } = e.latlng;
  document.getElementById('srLat').value = lat.toFixed(5);
  document.getElementById('srLng').value = lng.toFixed(5);

  if (pickMarker) fullMap.removeLayer(pickMarker);
  pickMarker = L.marker([lat, lng], { icon: makeMarkerIcon('#ef4444') })
    .addTo(fullMap)
    .bindPopup('<strong>New road location</strong><br>Fill in the details →')
    .openPopup();

  submitRoadOverlay.classList.add('open');
});

// ── Form submit ────────────────────────────────────────────────
submitRoadForm.addEventListener('submit', async e => {
  e.preventDefault();
  submitRoadError.textContent = '';
  submitRoadError.onclick = null;
  submitRoadError.style.cursor = '';

  // Resolve user — avoid race condition by querying Supabase directly if needed
  let user = window.__atlasUser;
  if (!user && db) {
    try {
      const { data: { session } } = await db.auth.getSession();
      user = session?.user ?? null;
      if (user) window.__atlasUser = user;
    } catch { /* continue to auth prompt */ }
  }

  if (!user) {
    submitRoadError.innerHTML = 'You must be signed in. <u style="cursor:pointer">Click to sign in →</u>';
    submitRoadError.style.cursor = 'pointer';
    submitRoadError.onclick = () => {
      closeSubmitRoad();
      document.getElementById('authBtn').click();
    };
    return;
  }

  const lat = parseFloat(document.getElementById('srLat').value);
  const lng = parseFloat(document.getElementById('srLng').value);
  if (isNaN(lat) || isNaN(lng) || (!lat && !lng)) {
    submitRoadError.textContent = 'Please set a location — click "Click map to place pin" then tap the map.';
    return;
  }

  const btn = document.getElementById('submitRoadSubmit');
  btn.disabled = true;
  btn.textContent = 'Submitting…';

  const name        = document.getElementById('srName').value.trim();
  const designation = document.getElementById('srDesignation').value.trim();
  const state       = document.getElementById('srState').value.trim();
  const region      = document.getElementById('srRegion').value;
  const type        = document.getElementById('srType').value;
  const difficulty  = document.getElementById('srDifficulty').value || null;
  const lengthMi    = parseFloat(document.getElementById('srLength').value) || null;
  const bestSeason  = document.getElementById('srSeason').value.trim() || null;
  const highlight   = document.getElementById('srHighlight').value.trim() || null;

  if (!name || !state || !region || !type) {
    submitRoadError.textContent = 'Please fill in name, state, region, and road type.';
    btn.disabled = false;
    btn.textContent = 'Add Road to Atlas';
    return;
  }

  const payload = { name, designation, state, region, type, difficulty, lengthMi, bestSeason, highlight, lat, lng, userId: user.id };

  // Build the road object for the map regardless of DB outcome
  function buildNewRoad(savedId) {
    return {
      name, designation: designation || '',
      state, region, type,
      length:      lengthMi ? `${lengthMi} mi` : '—',
      difficulty:  difficulty || '—',
      bestSeason:  bestSeason || '—',
      highlight:   highlight || '',
      lat, lng,
      id:          savedId || null,
      avgRating:   0,
      reviewCount: 0,
      source:      'community',
    };
  }

  function addRoadToMap(newRoad) {
    const idx   = ROADS.length;
    ROADS.push(newRoad);
    const color  = TYPE_COLORS[newRoad.type] || '#888';
    const marker = L.marker([newRoad.lat, newRoad.lng], { icon: makeMarkerIcon(color) })
      .bindPopup(buildPopupHTML(newRoad), { maxWidth: 280, maxHeight: 420 })
      .addTo(fullMap);
    marker.on('click', () => highlightListItem(idx));
    attachPopupDataLoader(marker, newRoad);
    markersByIndex[idx] = marker;
    if (pickMarker) { fullMap.removeLayer(pickMarker); pickMarker = null; }
    renderList();
    closeSubmitRoad();
    submitRoadForm.reset();
    flyToRoad(idx);
  }

  try {
    const road = await submitRoad(payload);
    addRoadToMap(buildNewRoad(road.id));
  } catch (err) {
    console.warn('Road submit to DB failed, adding locally:', err);
    // Still add to map in this session so the user can see it
    addRoadToMap(buildNewRoad(null));
    // Show a non-blocking note (modal already closed by addRoadToMap)
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add Road to Atlas';
  }
});
