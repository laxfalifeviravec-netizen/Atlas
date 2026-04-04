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
const TILE_URLS = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
const fullMap = L.map('fullMap', {
  center: [39.5, -98.35],
  zoom: 4,
  zoomControl: false,
  minZoom: 3,
  maxZoom: 17,
});
L.control.zoom({ position: 'bottomright' }).addTo(fullMap);

let tileLayer = L.tileLayer(TILE_URLS[currentTheme], {
  attribution: TILE_ATTR,
  maxZoom: 19,
}).addTo(fullMap);

function updateMapTiles(theme) {
  fullMap.removeLayer(tileLayer);
  tileLayer = L.tileLayer(TILE_URLS[theme] || TILE_URLS.dark, {
    attribution: TILE_ATTR,
    maxZoom: 19,
  }).addTo(fullMap);
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

function buildPopupHTML(road) {
  const color = TYPE_COLORS[road.type] || '#888';
  return `
    <div class="road-popup">
      <div class="road-popup-name">${road.name}</div>
      <div class="road-popup-desig">${road.designation} &middot; ${road.state}</div>
      <div class="road-popup-badges">
        <span class="road-popup-badge" style="background:${color}">${road.type}</span>
        <span class="road-popup-badge" style="background:#374151">${road.region}</span>
      </div>
      <div class="road-popup-row">
        <span class="road-popup-stat"><strong>${road.length}</strong></span>
        <span class="road-popup-stat">${road.difficulty}</span>
        <span class="road-popup-stat">${road.bestSeason}</span>
      </div>
    </div>
  `;
}

ROADS.forEach((road, i) => {
  const color = TYPE_COLORS[road.type] || '#888';
  const marker = L.marker([road.lat, road.lng], { icon: makeMarkerIcon(color) })
    .bindPopup(buildPopupHTML(road), { maxWidth: 260 })
    .addTo(fullMap);

  marker.on('click', () => {
    highlightListItem(i);
  });

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

let filteredRoads = [...ROADS];
let activeItem    = null;
let searchQuery   = '';
let regionFilter  = '';
let typeFilter    = '';

function renderList() {
  const results = ROADS
    .map((road, idx) => ({ road, idx }))
    .filter(({ road }) => {
      const matchSearch = !searchQuery ||
        road.name.toLowerCase().includes(searchQuery) ||
        road.state.toLowerCase().includes(searchQuery) ||
        road.type.toLowerCase().includes(searchQuery) ||
        road.designation.toLowerCase().includes(searchQuery);
      const matchRegion = !regionFilter || road.region === regionFilter;
      const matchType   = !typeFilter   || road.type   === typeFilter;
      return matchSearch && matchRegion && matchType;
    });

  // Show/hide reset button
  const hasFilter = searchQuery || regionFilter || typeFilter;
  resetBtn.style.display = hasFilter ? 'block' : 'none';

  // Update counts
  roadCount.textContent = `${results.length} road${results.length !== 1 ? 's' : ''}`;
  visibleCount.textContent = `${results.length} road${results.length !== 1 ? 's' : ''} shown`;

  // Fade out markers not in results
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
  results.forEach(({ road, idx }) => {
    const color = TYPE_COLORS[road.type] || '#888';
    const item = document.createElement('div');
    item.className = 'road-item';
    item.dataset.idx = idx;
    item.innerHTML = `
      <div class="road-type-dot" style="background:${color};color:${color}"></div>
      <div class="road-item-info">
        <div class="road-item-name">${road.name}</div>
        <div class="road-item-meta">${road.designation} &middot; ${road.state}</div>
      </div>
      <div class="road-item-length">${road.length}</div>
    `;
    item.addEventListener('click', () => flyToRoad(idx));
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

function resetAll() {
  searchQuery  = '';
  regionFilter = '';
  typeFilter   = '';
  sidebarSearch.value = '';
  searchClear.style.display = 'none';
  document.querySelectorAll('#regionFilter .chip').forEach((c, i) => c.classList.toggle('active', i === 0));
  document.querySelectorAll('#typeFilter .chip').forEach((c, i) => c.classList.toggle('active', i === 0));
  renderList();
}
resetBtn.addEventListener('click', resetAll);

// ── Initial render ─────────────────────────────────────────────
renderList();
