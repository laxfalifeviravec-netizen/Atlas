/* ============================================================
   Atlas — App JS
   ============================================================ */

// ── Theme Toggle ──────────────────────────────────────────────
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('atlas-theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('atlas-theme', next);
  updateMapTiles(next);
});

// ── Navbar scroll shadow ──────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

// ── Mobile nav toggle ─────────────────────────────────────────
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.classList.toggle('active', open);
  navToggle.setAttribute('aria-expanded', open);
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('active');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// ── Active nav link on scroll ─────────────────────────────────
const sections = ['features', 'explore', 'stats', 'search', 'contact'];
const navAnchors = navLinks.querySelectorAll('a[href^="#"]');

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      navAnchors.forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
      });
    }
  });
}, { threshold: 0.35 });

sections.forEach(id => {
  const el = document.getElementById(id);
  if (el) sectionObserver.observe(el);
});

// ── Region tabs ───────────────────────────────────────────────
const REGION_CENTERS = {
  westcoast: { lat: 44.0,  lng: -122.5, zoom: 5 },
  mountain:  { lat: 45.5,  lng: -109.0, zoom: 5 },
  southwest: { lat: 36.5,  lng: -112.0, zoom: 5 },
  southeast: { lat: 35.5,  lng: -83.0,  zoom: 5 },
  northeast: { lat: 43.0,  lng: -73.5,  zoom: 5 },
  midwest:   { lat: 41.5,  lng: -91.0,  zoom: 5 },
};

document.querySelectorAll('.region-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const region = tab.dataset.region;

    document.querySelectorAll('.region-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.region-panel').forEach(p => p.classList.remove('active'));

    tab.classList.add('active');
    const panel = document.querySelector(`.region-panel[data-region="${region}"]`);
    if (panel) panel.classList.add('active');

    // Fly map to region centre
    const c = REGION_CENTERS[region];
    if (c && atlasMap) atlasMap.flyTo([c.lat, c.lng], c.zoom, { duration: 1.2 });
  });
});

// ── Stats counter animation ───────────────────────────────────
function formatNumber(n, target) {
  if (target >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M+';
  if (target >= 1_000)     return (n / 1_000).toFixed(0) + 'K+';
  return n.toString();
}

function animateCounters() {
  document.querySelectorAll('.stat-number').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1800;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      el.textContent = formatNumber(current, target);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

const statsSection = document.getElementById('stats');
let statsAnimated = false;
const statsObserver = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting && !statsAnimated) {
    statsAnimated = true;
    animateCounters();
    statsObserver.disconnect();
  }
}, { threshold: 0.3 });
statsObserver.observe(statsSection);

// ── Search ────────────────────────────────────────────────────
const PLACES = [
  // West Coast
  { name: 'Pacific Coast Highway (Hwy 1)',   type: 'Coastal',   region: 'West Coast',   lat: 35.70,  lng: -121.30 },
  { name: 'Angeles Crest Highway',           type: 'Mountain',  region: 'West Coast',   lat: 34.25,  lng: -117.90 },
  { name: 'North Cascades Highway (WA-20)',  type: 'Mountain',  region: 'West Coast',   lat: 48.50,  lng: -120.70 },
  { name: 'Cascade Lakes Scenic Byway',      type: 'Scenic',    region: 'West Coast',   lat: 43.90,  lng: -121.70 },
  { name: 'Rim of the World Drive',          type: 'Mountain',  region: 'West Coast',   lat: 34.17,  lng: -117.05 },
  { name: 'Rogue-Umpqua Scenic Byway',       type: 'Scenic',    region: 'West Coast',   lat: 43.20,  lng: -122.90 },
  { name: 'Hana Highway (HI-360)',           type: 'Coastal',   region: 'West Coast',   lat: 20.80,  lng: -156.20 },
  { name: 'Seward Highway',                  type: 'Scenic',    region: 'West Coast',   lat: 60.40,  lng: -149.40 },
  { name: 'Mulholland Drive',                type: 'Technical', region: 'West Coast',   lat: 34.10,  lng: -118.40 },
  { name: 'Maricopa Highway (CA-33)',        type: 'Canyon',    region: 'West Coast',   lat: 34.80,  lng: -119.20 },
  { name: 'Old La Honda Road',               type: 'Technical', region: 'West Coast',   lat: 37.38,  lng: -122.22 },
  { name: 'Tioga Pass Road (CA-120)',        type: 'Mountain',  region: 'West Coast',   lat: 37.90,  lng: -119.25 },
  { name: 'Mount Tamalpais Summit Road',     type: 'Mountain',  region: 'West Coast',   lat: 37.93,  lng: -122.60 },
  { name: 'Kings Canyon Road (CA-180)',      type: 'Canyon',    region: 'West Coast',   lat: 36.79,  lng: -118.99 },
  { name: 'McKenzie Pass (OR-242)',          type: 'Mountain',  region: 'West Coast',   lat: 44.26,  lng: -121.85 },
  { name: 'Hurricane Ridge Road',            type: 'Mountain',  region: 'West Coast',   lat: 47.97,  lng: -123.50 },
  { name: 'Glacier Point Road (Yosemite)',   type: 'Scenic',    region: 'West Coast',   lat: 37.73,  lng: -119.57 },
  { name: 'Crater Lake Rim Drive (OR)',      type: 'Scenic',    region: 'West Coast',   lat: 42.95,  lng: -122.10 },
  // Mountain West
  { name: 'Beartooth Highway (US-212)',      type: 'Mountain',  region: 'Mountain West', lat: 45.03,  lng: -109.54 },
  { name: 'Going-to-the-Sun Road',           type: 'Mountain',  region: 'Mountain West', lat: 48.70,  lng: -113.73 },
  { name: 'Million Dollar Highway (US-550)', type: 'Mountain',  region: 'Mountain West', lat: 37.90,  lng: -107.73 },
  { name: 'Trail Ridge Road',                type: 'Mountain',  region: 'Mountain West', lat: 40.43,  lng: -105.75 },
  { name: 'Chief Joseph Scenic Byway',       type: 'Scenic',    region: 'Mountain West', lat: 44.70,  lng: -109.60 },
  { name: 'Needles Highway',                 type: 'Mountain',  region: 'Mountain West', lat: 43.68,  lng: -103.54 },
  { name: 'Iron Mountain Road',              type: 'Mountain',  region: 'Mountain West', lat: 43.85,  lng: -103.44 },
  { name: 'Hells Canyon Scenic Byway',       type: 'Canyon',    region: 'Mountain West', lat: 45.50,  lng: -116.70 },
  { name: 'Lolo Pass Road (US-12)',          type: 'Mountain',  region: 'Mountain West', lat: 46.60,  lng: -114.60 },
  { name: 'Pikes Peak Highway',              type: 'Technical', region: 'Mountain West', lat: 38.84,  lng: -105.04 },
  { name: 'Independence Pass (CO-82)',       type: 'Mountain',  region: 'Mountain West', lat: 39.09,  lng: -106.62 },
  { name: 'Mount Evans Road (CO-5)',         type: 'Mountain',  region: 'Mountain West', lat: 39.59,  lng: -105.64 },
  { name: 'Guanella Pass Scenic Byway',      type: 'Mountain',  region: 'Mountain West', lat: 39.61,  lng: -105.71 },
  { name: 'Cottonwood Pass (CO-306)',        type: 'Mountain',  region: 'Mountain West', lat: 38.83,  lng: -106.40 },
  { name: 'Teton Pass (WY-22)',              type: 'Technical', region: 'Mountain West', lat: 43.49,  lng: -110.96 },
  { name: 'Bighorn Scenic Byway (US-14A)',   type: 'Mountain',  region: 'Mountain West', lat: 44.55,  lng: -107.45 },
  { name: 'Logan Canyon Scenic Byway',       type: 'Canyon',    region: 'Mountain West', lat: 41.77,  lng: -111.64 },
  { name: 'Medicine Bow Peaks Scenic Byway', type: 'Mountain',  region: 'Mountain West', lat: 41.38,  lng: -105.94 },
  // Southwest
  { name: 'Highway 12',                      type: 'Scenic',    region: 'Southwest',    lat: 37.77,  lng: -111.56 },
  { name: 'Extraterrestrial Highway (NV-375)',type: 'Desert',   region: 'Southwest',    lat: 37.50,  lng: -115.37 },
  { name: 'Oak Creek Canyon (AZ-89A)',       type: 'Canyon',    region: 'Southwest',    lat: 34.84,  lng: -111.76 },
  { name: 'White Rim Road',                  type: 'Off-road',  region: 'Southwest',    lat: 38.18,  lng: -109.88 },
  { name: 'Loneliest Road (US-50)',          type: 'Desert',    region: 'Southwest',    lat: 39.50,  lng: -117.00 },
  { name: 'Historic Route 66',               type: 'Historic',  region: 'Southwest',    lat: 35.10,  lng: -106.60 },
  { name: 'Big Bend Ranch Road',             type: 'Desert',    region: 'Southwest',    lat: 29.25,  lng: -103.25 },
  { name: 'River Road (TX-170)',             type: 'Scenic',    region: 'Southwest',    lat: 29.50,  lng: -104.60 },
  { name: 'Death Valley Scenic Loop',        type: 'Desert',    region: 'Southwest',    lat: 36.50,  lng: -117.13 },
  { name: 'Geronimo Trail (NM-152)',         type: 'Mountain',  region: 'Southwest',    lat: 32.90,  lng: -107.60 },
  { name: 'Sky Island Scenic Byway (AZ)',    type: 'Mountain',  region: 'Southwest',    lat: 32.44,  lng: -110.79 },
  { name: 'Moki Dugway (UT-261)',            type: 'Technical', region: 'Southwest',    lat: 37.29,  lng: -109.96 },
  { name: 'Burr Trail Road',                 type: 'Canyon',    region: 'Southwest',    lat: 37.84,  lng: -111.00 },
  { name: 'Capitol Reef Scenic Drive',       type: 'Canyon',    region: 'Southwest',    lat: 38.10,  lng: -111.17 },
  { name: 'Sandia Crest Byway (NM-536)',     type: 'Mountain',  region: 'Southwest',    lat: 35.21,  lng: -106.45 },
  { name: 'Jerome Switchbacks (AZ-89A)',     type: 'Technical', region: 'Southwest',    lat: 34.75,  lng: -112.11 },
  { name: 'Red Canyon Scenic Byway (UT)',    type: 'Canyon',    region: 'Southwest',    lat: 37.73,  lng: -112.29 },
  { name: 'Twisted Sisters (TX FM-336/337)', type: 'Technical', region: 'Southwest',    lat: 29.83,  lng: -99.55  },
  // Southeast
  { name: 'Tail of the Dragon (US-129)',     type: 'Technical', region: 'Southeast',    lat: 35.47,  lng: -83.98  },
  { name: 'Blue Ridge Parkway',              type: 'Scenic',    region: 'Southeast',    lat: 36.08,  lng: -79.50  },
  { name: 'Cherohala Skyway',                type: 'Scenic',    region: 'Southeast',    lat: 35.38,  lng: -84.20  },
  { name: 'Moonshiner 28 (NC-28)',           type: 'Technical', region: 'Southeast',    lat: 35.27,  lng: -83.42  },
  { name: 'Overseas Highway (US-1)',         type: 'Coastal',   region: 'Southeast',    lat: 24.70,  lng: -80.90  },
  { name: 'Natchez Trace Parkway',           type: 'Historic',  region: 'Southeast',    lat: 34.70,  lng: -87.70  },
  { name: 'Foothills Parkway',               type: 'Scenic',    region: 'Southeast',    lat: 35.65,  lng: -83.85  },
  { name: 'Talimena Scenic Drive',           type: 'Scenic',    region: 'Southeast',    lat: 34.63,  lng: -94.85  },
  { name: 'Clingmans Dome Road',             type: 'Mountain',  region: 'Southeast',    lat: 35.56,  lng: -83.49  },
  { name: 'Little River Road (TN)',          type: 'Canyon',    region: 'Southeast',    lat: 35.65,  lng: -83.55  },
  { name: 'NC-215 Devil\'s Courthouse',      type: 'Technical', region: 'Southeast',    lat: 35.35,  lng: -82.97  },
  { name: 'NC-181 The Snake',                type: 'Technical', region: 'Southeast',    lat: 35.98,  lng: -81.80  },
  { name: 'Goshen Pass (VA-39)',             type: 'Canyon',    region: 'Southeast',    lat: 37.97,  lng: -79.54  },
  { name: 'Highland Scenic Highway (WV-150)',type: 'Scenic',    region: 'Southeast',    lat: 38.20,  lng: -80.19  },
  { name: 'Little River Canyon Rim Pkwy',    type: 'Canyon',    region: 'Southeast',    lat: 34.34,  lng: -85.60  },
  { name: 'Breaks Canyon Parkway (VA/KY)',   type: 'Canyon',    region: 'Southeast',    lat: 37.29,  lng: -82.29  },
  // Northeast
  { name: 'Kancamagus Highway (NH-112)',     type: 'Scenic',    region: 'Northeast',    lat: 44.05,  lng: -71.40  },
  { name: 'Skyline Drive',                   type: 'Scenic',    region: 'Northeast',    lat: 38.50,  lng: -78.50  },
  { name: 'Vermont Route 100',               type: 'Scenic',    region: 'Northeast',    lat: 43.90,  lng: -72.90  },
  { name: 'Mohawk Trail (MA-2)',             type: 'Historic',  region: 'Northeast',    lat: 42.67,  lng: -73.00  },
  { name: 'Acadia Loop Road',                type: 'Coastal',   region: 'Northeast',    lat: 44.32,  lng: -68.22  },
  { name: 'Mount Washington Auto Road',      type: 'Mountain',  region: 'Northeast',    lat: 44.27,  lng: -71.30  },
  { name: 'Smugglers Notch (VT-108)',        type: 'Technical', region: 'Northeast',    lat: 44.56,  lng: -72.79  },
  { name: 'Crawford Notch (NH-302)',         type: 'Mountain',  region: 'Northeast',    lat: 44.14,  lng: -71.42  },
  { name: 'Route 9N Adirondacks (NY)',       type: 'Scenic',    region: 'Northeast',    lat: 44.25,  lng: -73.75  },
  { name: 'Bear Mountain Loop (NY)',         type: 'Scenic',    region: 'Northeast',    lat: 41.31,  lng: -74.00  },
  { name: 'Taconic State Parkway (NY)',      type: 'Scenic',    region: 'Northeast',    lat: 42.00,  lng: -73.72  },
  { name: 'Franconia Notch Scenic Byway',    type: 'Mountain',  region: 'Northeast',    lat: 44.14,  lng: -71.68  },
  { name: 'Maine Route 1A Coastal',          type: 'Coastal',   region: 'Northeast',    lat: 44.53,  lng: -67.50  },
  { name: 'Mount Greylock Scenic Byway (MA)',type: 'Mountain',  region: 'Northeast',    lat: 42.63,  lng: -73.17  },
  // Midwest
  { name: 'Ozark Highlands Scenic Byway',    type: 'Scenic',    region: 'Midwest',      lat: 35.75,  lng: -93.40  },
  { name: 'Great River Road',                type: 'Scenic',    region: 'Midwest',      lat: 44.00,  lng: -91.50  },
  { name: 'Loess Hills Parkway',             type: 'Scenic',    region: 'Midwest',      lat: 42.05,  lng: -96.05  },
  { name: 'Tunnel of Trees (M-119)',         type: 'Scenic',    region: 'Midwest',      lat: 45.45,  lng: -85.00  },
  { name: 'Brockway Mountain Drive (MI)',    type: 'Mountain',  region: 'Midwest',      lat: 47.47,  lng: -88.08  },
  { name: 'Shawnee Hills Scenic Byway (IL)', type: 'Scenic',    region: 'Midwest',      lat: 37.60,  lng: -89.25  },
  { name: 'Galena Territory Roads (IL)',     type: 'Scenic',    region: 'Midwest',      lat: 42.42,  lng: -90.43  },
  { name: 'Duluth Skyline Parkway (MN)',     type: 'Scenic',    region: 'Midwest',      lat: 46.82,  lng: -92.10  },
  { name: 'Lutsen Mountains Byway (MN)',     type: 'Mountain',  region: 'Midwest',      lat: 47.65,  lng: -90.69  },
  { name: 'Apostle Islands Scenic Byway (WI)',type: 'Coastal',  region: 'Midwest',      lat: 46.86,  lng: -90.83  },
  { name: 'Kettle Moraine Scenic Drive (WI)',type: 'Scenic',    region: 'Midwest',      lat: 43.00,  lng: -88.42  },
  // West Coast — additional
  { name: 'Ortega Highway (CA-74)',          type: 'Technical', region: 'West Coast',   lat: 33.55,  lng: -117.38 },
  { name: 'Nacimiento-Fergusson Road',       type: 'Coastal',   region: 'West Coast',   lat: 35.98,  lng: -121.47 },
  { name: 'Malibu Canyon Road (CA)',         type: 'Canyon',    region: 'West Coast',   lat: 34.08,  lng: -118.73 },
  { name: 'Lost Coast Highway (CA)',         type: 'Coastal',   region: 'West Coast',   lat: 40.24,  lng: -124.07 },
  { name: 'Sonoma Coast (CA-1 North)',       type: 'Coastal',   region: 'West Coast',   lat: 38.52,  lng: -123.22 },
  { name: 'CA-49 Gold Country Route',        type: 'Scenic',    region: 'West Coast',   lat: 38.35,  lng: -120.55 },
  { name: 'Stevens Pass (WA-2)',             type: 'Mountain',  region: 'West Coast',   lat: 47.74,  lng: -121.09 },
  { name: 'Mount Baker Highway (WA-542)',    type: 'Mountain',  region: 'West Coast',   lat: 48.82,  lng: -121.68 },
  { name: 'Chinook Pass (WA-410)',           type: 'Mountain',  region: 'West Coast',   lat: 46.87,  lng: -121.52 },
  { name: 'White Pass (WA-12)',              type: 'Mountain',  region: 'West Coast',   lat: 46.64,  lng: -121.39 },
  { name: 'Santiam Pass (US-20 OR)',         type: 'Mountain',  region: 'West Coast',   lat: 44.42,  lng: -121.87 },
  { name: 'Fish Lake Road (OR-140)',         type: 'Scenic',    region: 'West Coast',   lat: 42.55,  lng: -122.32 },
  { name: 'Richardson Highway (AK)',         type: 'Scenic',    region: 'West Coast',   lat: 62.10,  lng: -145.50 },
  { name: 'Saddle Road (HI-200)',            type: 'Mountain',  region: 'West Coast',   lat: 19.73,  lng: -155.44 },
  { name: 'Pilot Rock Road (OR)',            type: 'Scenic',    region: 'West Coast',   lat: 42.10,  lng: -122.78 },
  // Mountain West — additional
  { name: 'Loveland Pass (US-6 CO)',         type: 'Mountain',  region: 'Mountain West', lat: 39.66,  lng: -105.89 },
  { name: 'Wolf Creek Pass (US-160 CO)',     type: 'Mountain',  region: 'Mountain West', lat: 37.48,  lng: -106.79 },
  { name: 'Monarch Pass (US-50 CO)',         type: 'Mountain',  region: 'Mountain West', lat: 38.49,  lng: -106.33 },
  { name: 'Rabbit Ears Pass (US-40 CO)',     type: 'Mountain',  region: 'Mountain West', lat: 40.37,  lng: -106.58 },
  { name: 'Cameron Pass (CO-14)',            type: 'Mountain',  region: 'Mountain West', lat: 40.52,  lng: -105.90 },
  { name: 'Hoosier Pass (CO-9)',             type: 'Mountain',  region: 'Mountain West', lat: 39.36,  lng: -106.07 },
  { name: 'Peak to Peak Highway (CO-72)',    type: 'Scenic',    region: 'Mountain West', lat: 40.05,  lng: -105.53 },
  { name: 'Rim Rock Drive (CO)',             type: 'Canyon',    region: 'Mountain West', lat: 39.10,  lng: -108.73 },
  { name: 'San Juan Skyway (CO)',            type: 'Scenic',    region: 'Mountain West', lat: 37.55,  lng: -107.99 },
  { name: 'Slumgullion Pass (CO-149)',       type: 'Mountain',  region: 'Mountain West', lat: 37.97,  lng: -107.18 },
  { name: 'Sawtooth Scenic Byway (ID-75)',   type: 'Scenic',    region: 'Mountain West', lat: 43.91,  lng: -114.74 },
  { name: 'Galena Summit (ID-75)',           type: 'Mountain',  region: 'Mountain West', lat: 43.87,  lng: -114.74 },
  { name: 'Ponderosa Pine Byway (ID-21)',    type: 'Scenic',    region: 'Mountain West', lat: 44.10,  lng: -115.42 },
  { name: 'Lost River Valley (US-93 ID)',    type: 'Scenic',    region: 'Mountain West', lat: 43.97,  lng: -113.95 },
  { name: 'Many Glacier Road (MT)',          type: 'Mountain',  region: 'Mountain West', lat: 48.80,  lng: -113.65 },
  { name: 'Lamar Valley (US-212 WY)',        type: 'Scenic',    region: 'Mountain West', lat: 44.90,  lng: -110.20 },
  { name: 'Gros Ventre Road (WY)',           type: 'Technical', region: 'Mountain West', lat: 43.59,  lng: -110.55 },
  { name: 'Ten Sleep Canyon (WY-16)',        type: 'Canyon',    region: 'Mountain West', lat: 44.05,  lng: -107.36 },
  { name: 'Mirror Lake Scenic Byway (UT)',   type: 'Scenic',    region: 'Mountain West', lat: 40.70,  lng: -110.88 },
  { name: 'Guardsman Pass (UT)',             type: 'Mountain',  region: 'Mountain West', lat: 40.53,  lng: -111.56 },
  { name: 'Flaming Gorge Byway (UT-44)',     type: 'Scenic',    region: 'Mountain West', lat: 40.91,  lng: -109.42 },
  // Southwest — additional
  { name: 'Zion-Mt Carmel Highway (UT-9)',   type: 'Technical', region: 'Southwest',    lat: 37.21,  lng: -112.95 },
  { name: 'Cedar Breaks Scenic Road (UT-143)',type:'Mountain',  region: 'Southwest',    lat: 37.62,  lng: -112.84 },
  { name: 'Bryce Canyon Rim Road (UT-63)',   type: 'Scenic',    region: 'Southwest',    lat: 37.64,  lng: -112.17 },
  { name: 'Dead Horse Point Road (UT-313)',  type: 'Scenic',    region: 'Southwest',    lat: 38.48,  lng: -109.74 },
  { name: 'Arches Scenic Drive (UT)',        type: 'Scenic',    region: 'Southwest',    lat: 38.73,  lng: -109.59 },
  { name: "Hell's Backbone Road (UT)",       type: 'Technical', region: 'Southwest',    lat: 37.93,  lng: -111.58 },
  { name: 'Enchanted Circle Byway (NM)',     type: 'Scenic',    region: 'Southwest',    lat: 36.55,  lng: -105.40 },
  { name: 'High Road to Taos (NM-76)',       type: 'Mountain',  region: 'Southwest',    lat: 36.07,  lng: -105.77 },
  { name: 'Jemez Mountain Trail (NM-4)',     type: 'Mountain',  region: 'Southwest',    lat: 35.85,  lng: -106.65 },
  { name: 'Davis Mountains Loop (TX-118)',   type: 'Scenic',    region: 'Southwest',    lat: 30.52,  lng: -103.80 },
  { name: 'Apache Trail (AZ-88)',            type: 'Canyon',    region: 'Southwest',    lat: 33.52,  lng: -111.45 },
  { name: 'Senator Highway (AZ)',            type: 'Mountain',  region: 'Southwest',    lat: 34.53,  lng: -112.45 },
  { name: 'Crown King Road (AZ)',            type: 'Technical', region: 'Southwest',    lat: 34.20,  lng: -112.34 },
  { name: 'Lamoille Canyon Road (NV)',       type: 'Canyon',    region: 'Southwest',    lat: 40.66,  lng: -115.43 },
  { name: 'Vermilion Cliffs Byway (AZ)',     type: 'Desert',    region: 'Southwest',    lat: 36.85,  lng: -111.95 },
  { name: 'Kolob Canyons Road (UT)',         type: 'Canyon',    region: 'Southwest',    lat: 37.43,  lng: -113.18 },
  // Southeast — additional
  { name: 'Wolf Pen Gap Road (GA-180)',      type: 'Technical', region: 'Southeast',    lat: 34.83,  lng: -84.22  },
  { name: 'Suches Valley Loop (GA)',         type: 'Scenic',    region: 'Southeast',    lat: 34.73,  lng: -84.30  },
  { name: 'Brasstown Bald Road (GA)',        type: 'Mountain',  region: 'Southeast',    lat: 34.87,  lng: -83.81  },
  { name: 'Richard Russell Scenic Hwy (GA)',type: 'Scenic',    region: 'Southeast',    lat: 34.74,  lng: -83.84  },
  { name: 'Cohutta Wilderness Road (GA)',    type: 'Scenic',    region: 'Southeast',    lat: 34.88,  lng: -84.64  },
  { name: 'Rich Mountain Road (TN-73)',      type: 'Mountain',  region: 'Southeast',    lat: 35.68,  lng: -83.73  },
  { name: 'Parsons Branch Road (TN)',        type: 'Technical', region: 'Southeast',    lat: 35.44,  lng: -83.91  },
  { name: 'Clinch Mountain (TN-33)',         type: 'Mountain',  region: 'Southeast',    lat: 36.46,  lng: -82.78  },
  { name: 'Roan Mountain (TN/NC-143)',       type: 'Mountain',  region: 'Southeast',    lat: 36.10,  lng: -82.10  },
  { name: 'Spruce Knob Road (WV)',           type: 'Mountain',  region: 'Southeast',    lat: 38.70,  lng: -79.53  },
  { name: 'Dolly Sods Scenic Area (WV)',     type: 'Scenic',    region: 'Southeast',    lat: 38.96,  lng: -79.45  },
  { name: 'Seneca Rocks Byway (WV)',         type: 'Technical', region: 'Southeast',    lat: 38.83,  lng: -79.37  },
  { name: 'Shenandoah Mountain Byway (VA)',  type: 'Mountain',  region: 'Southeast',    lat: 38.40,  lng: -79.22  },
  { name: 'Floyd County Roads (VA-8)',       type: 'Technical', region: 'Southeast',    lat: 36.92,  lng: -80.32  },
  { name: 'Clinch Valley Byway (US-58 VA)', type: 'Scenic',    region: 'Southeast',    lat: 36.72,  lng: -82.10  },
  { name: 'Cumberland Gap (US-25E TN/KY)',   type: 'Mountain',  region: 'Southeast',    lat: 36.60,  lng: -83.67  },
  { name: 'Natural Bridge Scenic (VA-130)',  type: 'Scenic',    region: 'Southeast',    lat: 37.63,  lng: -79.54  },
  { name: 'Amelia Island Scenic (FL-A1A)',   type: 'Coastal',   region: 'Southeast',    lat: 30.67,  lng: -81.46  },
  // Northeast — additional
  { name: 'Pinkham Notch (NH-16)',           type: 'Mountain',  region: 'Northeast',    lat: 44.19,  lng: -71.17  },
  { name: 'Grafton Notch (ME-26)',           type: 'Mountain',  region: 'Northeast',    lat: 44.58,  lng: -70.83  },
  { name: 'Evans Notch (ME-113)',            type: 'Mountain',  region: 'Northeast',    lat: 44.24,  lng: -71.00  },
  { name: 'Dixville Notch (NH-26)',          type: 'Mountain',  region: 'Northeast',    lat: 44.87,  lng: -71.32  },
  { name: 'Appalachian Gap (VT-17)',         type: 'Technical', region: 'Northeast',    lat: 44.21,  lng: -73.00  },
  { name: 'Lincoln Gap (VT)',                type: 'Technical', region: 'Northeast',    lat: 44.08,  lng: -72.93  },
  { name: 'Middlebury Gap (VT-125)',         type: 'Mountain',  region: 'Northeast',    lat: 43.95,  lng: -72.92  },
  { name: 'Granville Gulf (VT-100)',         type: 'Canyon',    region: 'Northeast',    lat: 43.97,  lng: -72.83  },
  { name: 'Delaware Water Gap (US-209 NJ)',  type: 'Scenic',    region: 'Northeast',    lat: 40.97,  lng: -75.14  },
  { name: 'Pennsylvania Grand Canyon (US-6)',type: 'Canyon',    region: 'Northeast',    lat: 41.64,  lng: -77.62  },
  { name: 'Whiteface Mountain Road (NY)',    type: 'Mountain',  region: 'Northeast',    lat: 44.37,  lng: -73.90  },
  { name: 'Route 28 Adirondacks (NY)',       type: 'Scenic',    region: 'Northeast',    lat: 43.35,  lng: -74.57  },
  { name: 'Catskill Mountain Road (NY-28)', type: 'Scenic',    region: 'Northeast',    lat: 42.10,  lng: -74.45  },
  { name: 'Hudson Highlands Byway (NY)',     type: 'Scenic',    region: 'Northeast',    lat: 41.39,  lng: -73.95  },
  { name: 'Hawk Mountain Road (PA)',         type: 'Scenic',    region: 'Northeast',    lat: 40.64,  lng: -75.99  },
  { name: 'Hyner Run Road (PA)',             type: 'Technical', region: 'Northeast',    lat: 41.33,  lng: -77.64  },
  // Midwest — additional
  { name: 'Spearfish Canyon (SD-14A)',       type: 'Canyon',    region: 'Midwest',      lat: 44.52,  lng: -103.86 },
  { name: 'Peter Norbeck Scenic Byway (SD)', type: 'Mountain',  region: 'Midwest',      lat: 43.87,  lng: -103.44 },
  { name: 'Wildlife Loop Road (SD)',         type: 'Scenic',    region: 'Midwest',      lat: 43.71,  lng: -103.48 },
  { name: 'North Shore Scenic Drive (MN-61)',type: 'Coastal',   region: 'Midwest',      lat: 47.00,  lng: -91.63  },
  { name: 'Gunflint Trail (MN-12)',          type: 'Scenic',    region: 'Midwest',      lat: 48.10,  lng: -90.58  },
  { name: 'Scenic 7 Byway (AR-7)',           type: 'Scenic',    region: 'Midwest',      lat: 35.43,  lng: -92.60  },
  { name: 'Mount Magazine Road (AR-309)',    type: 'Mountain',  region: 'Midwest',      lat: 35.17,  lng: -93.65  },
  { name: "Devil's Den Road (AR-170)",       type: 'Canyon',    region: 'Midwest',      lat: 35.83,  lng: -94.24  },
  { name: 'Buffalo River Road (AR-74)',      type: 'Scenic',    region: 'Midwest',      lat: 36.00,  lng: -92.97  },
  { name: 'Door County (WI-42)',             type: 'Coastal',   region: 'Midwest',      lat: 45.05,  lng: -87.00  },
  { name: 'Driftless Region Scenic (WI-35)', type: 'Scenic',    region: 'Midwest',      lat: 43.05,  lng: -90.87  },
  { name: 'Pictured Rocks Route (MI-28)',    type: 'Scenic',    region: 'Midwest',      lat: 46.42,  lng: -86.61  },
  { name: 'Sleeping Bear Dunes (MI-22)',     type: 'Coastal',   region: 'Midwest',      lat: 44.85,  lng: -86.03  },
  { name: 'Leelanau Peninsula (MI-22)',      type: 'Scenic',    region: 'Midwest',      lat: 45.08,  lng: -85.68  },
  { name: 'Garden Peninsula (MI-183)',       type: 'Coastal',   region: 'Midwest',      lat: 45.83,  lng: -86.57  },
  { name: 'Flint Hills Scenic Byway (KS)',   type: 'Scenic',    region: 'Midwest',      lat: 38.43,  lng: -96.45  },
  { name: 'Wichita Mountains Byway (OK-49)', type: 'Scenic',    region: 'Midwest',      lat: 34.73,  lng: -98.68  },
  { name: 'Current River Byway (MO)',        type: 'Scenic',    region: 'Midwest',      lat: 37.47,  lng: -90.75  },
  { name: 'Nebraska Sandhills (US-2)',       type: 'Desert',    region: 'Midwest',      lat: 42.06,  lng: -101.80 },
  { name: 'Niobrara River Valley (NE)',      type: 'Scenic',    region: 'Midwest',      lat: 42.73,  lng: -100.42 },
];

const pinIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
</svg>`;

const searchInput   = document.getElementById('searchInput');
const searchBtn     = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');

function renderResults(query) {
  const q = query.trim().toLowerCase();
  searchResults.innerHTML = '';

  if (!q) return;

  const matches = PLACES.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.type.toLowerCase().includes(q) ||
    p.region.toLowerCase().includes(q)
  ).slice(0, 8);

  if (!matches.length) {
    searchResults.innerHTML = `<div class="search-empty">No results found for "<strong>${escapeHtml(query)}</strong>". Try a different search term.</div>`;
    return;
  }

  matches.forEach(place => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `View ${place.name} on map`);
    item.innerHTML = `
      <div class="search-result-icon">${pinIconSVG}</div>
      <div class="search-result-text">
        <div class="search-result-name">${highlightMatch(place.name, q)}</div>
        <div class="search-result-type">${place.type} &middot; ${place.region}</div>
      </div>
      <span class="search-result-action">Show on map →</span>
    `;

    const flyToPlace = () => {
      if (atlasMap) {
        document.getElementById('explore').scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
          atlasMap.flyTo([place.lat, place.lng], 10, { duration: 1.5 });
          openPopupAtLocation(place.lat, place.lng, place.name);
        }, 600);
      }
    };

    item.addEventListener('click', flyToPlace);
    item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') flyToPlace(); });
    searchResults.appendChild(item);
  });
}

function highlightMatch(text, query) {
  const idx = text.toLowerCase().indexOf(query);
  if (idx === -1) return escapeHtml(text);
  return escapeHtml(text.slice(0, idx)) +
    `<mark style="background:rgba(79,70,229,.15);color:var(--color-primary);border-radius:2px;">${escapeHtml(text.slice(idx, idx + query.length))}</mark>` +
    escapeHtml(text.slice(idx + query.length));
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

let searchDebounce;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => renderResultsFiltered(searchInput.value), 200);
});
searchBtn.addEventListener('click', () => renderResultsFiltered(searchInput.value));
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') renderResultsFiltered(searchInput.value); });

// ── Geolocation ───────────────────────────────────────────────
const locateBtn = document.getElementById('locateBtn');

locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }
  locateBtn.classList.add('locating');
  locateBtn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      locateBtn.classList.remove('locating');
      locateBtn.disabled = false;

      searchResults.innerHTML = `
        <div class="search-result-item located-result">
          <div class="search-result-icon">${pinIconSVG}</div>
          <div class="search-result-text">
            <div class="search-result-name">Your Location</div>
            <div class="search-result-type">${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E &middot; GPS</div>
          </div>
        </div>
      `;

      if (atlasMap) {
        document.getElementById('explore').scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
          atlasMap.flyTo([lat, lng], 12, { duration: 1.5 });
          L.popup()
            .setLatLng([lat, lng])
            .setContent('<strong>You are here</strong>')
            .openOn(atlasMap);
        }, 600);
      }
    },
    err => {
      locateBtn.classList.remove('locating');
      locateBtn.disabled = false;
      const messages = {
        1: 'Location access was denied.',
        2: 'Location unavailable. Please try again.',
        3: 'Location request timed out.',
      };
      searchResults.innerHTML = `<div class="search-empty">${messages[err.code] || 'Could not get your location.'}</div>`;
    },
    { timeout: 10000 }
  );
});

// ── Interactive Map (Leaflet) ─────────────────────────────────
let atlasMap = null;
let tileLayer = null;
let searchPopup = null;

const TILE_URLS = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

function initMap() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

  atlasMap = L.map('atlasMap', {
    center: [48, 14],
    zoom: 4,
    zoomControl: true,
    scrollWheelZoom: false,
  });

  tileLayer = L.tileLayer(TILE_URLS[currentTheme], {
    attribution: TILE_ATTR,
    maxZoom: 19,
  }).addTo(atlasMap);

  // Add markers for all featured places
  const markerIcon = L.divIcon({
    className: 'atlas-marker',
    html: '<div class="atlas-marker-inner"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });

  PLACES.forEach(place => {
    L.marker([place.lat, place.lng], { icon: markerIcon })
      .bindPopup(`<strong>${place.name}</strong><br><span style="color:#6b7280;font-size:0.85em">${place.type} · ${place.region}</span>`)
      .addTo(atlasMap);
  });
}

function updateMapTiles(theme) {
  if (!atlasMap || !tileLayer) return;
  atlasMap.removeLayer(tileLayer);
  tileLayer = L.tileLayer(TILE_URLS[theme] || TILE_URLS.light, {
    attribution: TILE_ATTR,
    maxZoom: 19,
  }).addTo(atlasMap);
}

function openPopupAtLocation(lat, lng, name) {
  if (!atlasMap) return;
  if (searchPopup) searchPopup.remove();
  searchPopup = L.popup()
    .setLatLng([lat, lng])
    .setContent(`<strong>${name}</strong>`)
    .openOn(atlasMap);
}

// Initialize map — wrapped in try-catch so a map failure never crashes the rest of the app
try {
  initMap();
} catch (e) {
  console.error('Map init failed:', e);
  const el = document.getElementById('atlasMap');
  if (el) el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-text-muted);font-family:var(--font-body)">Map unavailable — check your connection</div>';
}

// Wire up place card clicks
document.querySelectorAll('.place-card').forEach(card => {
  const lat  = parseFloat(card.dataset.lat);
  const lng  = parseFloat(card.dataset.lng);
  const name = card.dataset.name;

  const activate = () => {
    if (atlasMap) atlasMap.flyTo([lat, lng], 10, { duration: 1.2 });
    const place = PLACES.find(p => Math.abs(p.lat - lat) < 0.01 && Math.abs(p.lng - lng) < 0.01)
               || { name, type: 'Scenic', region: 'Unknown', lat, lng };
    openRoadModal(place);
  };

  card.addEventListener('click', activate);
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') activate(); });
});

// ── Contact form — mailto ─────────────────────────────────────
const contactForm = document.getElementById('contactForm');

function setError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) input.classList.toggle('error', !!message);
  if (error) error.textContent = message || '';
}

function validateForm() {
  let valid = true;

  const name    = document.getElementById('name').value.trim();
  const email   = document.getElementById('email').value.trim();
  const message = document.getElementById('message').value.trim();

  if (!name) {
    setError('name', 'nameError', 'Please enter your name.');
    valid = false;
  } else {
    setError('name', 'nameError', '');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    setError('email', 'emailError', 'Please enter your email address.');
    valid = false;
  } else if (!emailRegex.test(email)) {
    setError('email', 'emailError', 'Please enter a valid email address.');
    valid = false;
  } else {
    setError('email', 'emailError', '');
  }

  if (!message || message.length < 10) {
    setError('message', 'messageError', 'Message must be at least 10 characters.');
    valid = false;
  } else {
    setError('message', 'messageError', '');
  }

  return valid;
}

contactForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!validateForm()) return;

  const btn = contactForm.querySelector('button[type="submit"]');
  btn.textContent = 'Opening email…';
  btn.disabled = true;

  const nameVal    = document.getElementById('name').value.trim();
  const emailVal   = document.getElementById('email').value.trim();
  const subjectEl  = document.getElementById('subject');
  const subjectLabel = subjectEl.options[subjectEl.selectedIndex].text || 'General Inquiry';
  const messageVal = document.getElementById('message').value.trim();

  const mailSubject = encodeURIComponent(`[Atlas] ${subjectLabel}`);
  const mailBody    = encodeURIComponent(`From: ${nameVal} <${emailVal}>\n\n${messageVal}`);

  window.location.href = `mailto:hello@atlas.app?subject=${mailSubject}&body=${mailBody}`;

  setTimeout(() => {
    contactForm.reset();
    btn.textContent = 'Send Message';
    btn.disabled = false;
    document.getElementById('formSuccess').classList.add('visible');
    setTimeout(() => document.getElementById('formSuccess').classList.remove('visible'), 5000);
  }, 600);
});

['name', 'email', 'message'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => el.classList.remove('error'));
});

// ── Scroll reveal for feature cards ──────────────────────────
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const delay = (parseInt(el.dataset.index || '0', 10) % 3) * 80;
      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, delay);
      revealObserver.unobserve(el);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.feature-card').forEach(card => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(20px)';
  card.style.transition = 'opacity 0.45s ease, transform 0.45s ease, box-shadow 0.22s ease, border-color 0.22s ease';
  revealObserver.observe(card);
});

// ── Rich road data ────────────────────────────────────────────
const ROAD_DATA = {
  'Pacific Coast Highway (Hwy 1)': { length: '656 mi', difficulty: 2, surface: 'Excellent', bestTime: 'Year-round', status: 'open', description: 'The crown jewel of American coastal driving. 656 miles of ocean bluffs, sea stacks, and sweeping curves from LA to the Oregon border — with Bixby Bridge as the defining stop.', tip: 'Drive south-to-north for the best ocean views on your side of the road. Midweek mornings are almost traffic-free.' },
  'Angeles Crest Highway': { length: '66 mi', difficulty: 3, surface: 'Good', bestTime: 'Apr–Nov', status: 'seasonal', description: 'A rapid climb from the LA basin to 7,902 ft through the San Gabriel Mountains. Genuinely technical switchbacks with almost no traffic — a sports car driver\'s secret hiding in plain sight.', tip: 'Check Caltrans for closures after rain — debris is common. Sunrise runs give you the mountain to yourself.' },
  'Mulholland Drive': { length: '21 mi', difficulty: 3, surface: 'Good', bestTime: 'Year-round', status: 'open', description: 'The ridge road running the spine of the Santa Monica Mountains above Los Angeles. Technical canyon-carving with city views in both directions — a 21-mile proving ground in the middle of a metropolis.', tip: 'Go at dawn on a weekday. By 9am you share it with Ubers, cyclists, and distracted sightseers.' },
  'Tioga Pass Road (CA-120)': { length: '39 mi', difficulty: 3, surface: 'Excellent', bestTime: 'Jun–Oct', status: 'seasonal', description: 'The highest paved crossing in the Sierra Nevada at 9,945 ft, cutting through Yosemite\'s high country of polished granite and subalpine lakes.', tip: 'Usually opens late May–June. Check NPS. Tenaya Lake section is worth stopping at every single time.' },
  'Beartooth Highway (US-212)': { length: '68 mi', difficulty: 4, surface: 'Good', bestTime: 'Jun–Sep', status: 'seasonal', description: 'Charles Kuralt\'s "most beautiful road in America." Switchbacks climb to 10,947 ft through tundra plateaus and glaciers with a view horizon that stretches into Wyoming.', tip: 'Snow is possible any month at elevation. Fill up in Red Lodge — next fuel is 70 miles away.' },
  'Going-to-the-Sun Road': { length: '50 mi', difficulty: 3, surface: 'Good', bestTime: 'Jul–Sep', status: 'seasonal', description: 'Carved directly into the Continental Divide at Glacier NP — one of the great engineering achievements of the National Park Service. Exposed cliff edges, waterfalls, and mountain goats at every turn.', tip: 'Vehicle length limits apply — check NPS. Get there before 9am to skip mandatory shuttle periods.' },
  'Million Dollar Highway (US-550)': { length: '25 mi', difficulty: 5, surface: 'Good', bestTime: 'Jun–Oct', status: 'seasonal', description: 'Ouray to Silverton through the San Juans: no guardrails on the inside lane, sheer drop-offs of hundreds of feet, and the kind of exposure that sorts out serious drivers from the rest.', tip: 'This road does not forgive distraction. No-guardrail sections are real — drive the centre line with confidence.' },
  'Pikes Peak Highway': { length: '19 mi', difficulty: 5, surface: 'Good', bestTime: 'May–Oct', status: 'seasonal', description: 'The race-proven ascent to 14,115 ft — site of the Pikes Peak International Hill Climb since 1916. 156 corners, fully paved since 2011, and a summit that is genuinely above the clouds.', tip: 'Brake fade is a real risk on the descent. Downshift early and use engine braking — your pads will thank you.' },
  'Independence Pass (CO-82)': { length: '20 mi', difficulty: 4, surface: 'Good', bestTime: 'Jun–Oct', status: 'seasonal', description: 'Colorado\'s highest paved pass at 12,095 ft between Aspen and Twin Lakes. Exposed switchbacks, thin air, and a summit with 360° alpine views.', tip: 'Vehicle limit of 35 ft. Altitude affects fuel delivery at the top — give the engine time to adjust.' },
  'Mount Evans Road (CO-5)': { length: '14 mi', difficulty: 4, surface: 'Fair', bestTime: 'Jun–Sep', status: 'seasonal', description: 'The highest paved auto road in North America at 14,265 ft. 28 miles of switchbacks above the treeline with mountain goats literally on the tarmac.', tip: 'No guardrails above treeline. Afternoon thunderstorms are daily in July–August — summit by noon, no exceptions.' },
  'Highway 12': { length: '124 mi', difficulty: 2, surface: 'Excellent', bestTime: 'Apr–Oct', status: 'open', description: 'Utah\'s Highway 12 threads through Bryce Canyon, Grand Staircase–Escalante, and Capitol Reef — arguably the most scenically dense road in North America.', tip: 'The Hogsback section is genuinely exposed with drop-offs on both sides. Drive it at dawn for golden light on the sandstone.' },
  'Moki Dugway (UT-261)': { length: '3 mi', difficulty: 4, surface: 'Gravel', bestTime: 'Mar–Nov', status: 'open', description: 'Three miles of unpaved switchbacks hand-blasted into the face of Cedar Mesa in 1958. No guardrails. 1,100 ft of exposure. One of the most dramatic short stretches of road in the world.', tip: 'RVs and trailers not recommended. Descend with low gear engaged — loose gravel on the steep corners is serious.' },
  'Twisted Sisters (TX FM-336/337)': { length: '100 mi', difficulty: 4, surface: 'Good', bestTime: 'Oct–May', status: 'open', description: 'Three farm-to-market roads in the Texas Hill Country that loop through river gorges and ridgelines with tight, rhythmic corners that reward smooth, committed driving.', tip: 'Leakey is the unofficial hub — fuel, food, and locals who know every mile. Spring and fall are perfect conditions.' },
  'Tail of the Dragon (US-129)': { length: '11 mi', difficulty: 5, surface: 'Excellent', bestTime: 'Apr–Nov', status: 'open', description: '318 curves packed into 11 miles with zero intersections, zero driveways, and zero distractions. The most famous driving road in America, and it earns every bit of that reputation.', tip: 'Go on a weekday morning to avoid bikes and cruisers. It\'s over fast — most drivers go back for a second pass.' },
  'Moonshiner 28 (NC-28)': { length: '28 mi', difficulty: 4, surface: 'Good', bestTime: 'Apr–Nov', status: 'open', description: 'One of the best roads in the Southeast that almost nobody talks about. 28 miles of technical switchbacks and sweeping bends through the Nantahala Forest.', tip: 'Less traffic than the Dragon — locals\' choice. The stretch from Fontana Dam is the most technical section.' },
  'Cherohala Skyway': { length: '43 mi', difficulty: 2, surface: 'Excellent', bestTime: 'May–Nov', status: 'open', description: 'The less-crowded sibling to the Tail of the Dragon. 43 miles of ridge-top cruising through the Cherokee and Nantahala National Forests with almost no traffic.', tip: 'Combine with the Dragon for a full day loop. Cherohala rewards smooth, flowing driving — not trail braking.' },
  'Blue Ridge Parkway': { length: '469 mi', difficulty: 2, surface: 'Good', bestTime: 'Apr–Nov', status: 'seasonal', description: 'America\'s Favourite Drive runs 469 miles along the Appalachian spine. No commercial vehicles, no billboards, no traffic lights — just pure ridge-top driving for 469 miles.', tip: 'The Linn Cove Viaduct (MP 304) is the engineering highlight. Drive it at 45mph with the windows down.' },
  'Kancamagus Highway (NH-112)': { length: '35 mi', difficulty: 2, surface: 'Excellent', bestTime: 'Sep–Oct', status: 'open', description: 'New Hampshire\'s "Kanc" climbs over Kancamagus Pass through White Mountain National Forest. A genuinely flowing road with October foliage spectacle that\'s hard to match anywhere in the US.', tip: 'Peak foliage is usually the second week of October. Early morning fog in the valleys creates surreal driving conditions.' },
  'Smugglers Notch (VT-108)': { length: '5 mi', difficulty: 5, surface: 'Good', bestTime: 'May–Oct', status: 'seasonal', description: 'A mountain notch so narrow that boulders literally touch both sides of the road. Closed all winter. 5 miles of switchbacks and blind corners through a gap in the Green Mountains.', tip: 'Cars over 21 ft are banned. This is NOT the road for wide-bodied sports cars — the clearances are measured in inches.' },
  'Skyline Drive': { length: '105 mi', difficulty: 1, surface: 'Excellent', bestTime: 'Apr–Nov', status: 'open', description: 'The ridge road through Shenandoah National Park. 35mph limit, 75 overlooks, and near-zero traffic midweek — one of the most relaxing drives on the East Coast.', tip: 'Enter at Rockfish Gap (South Entrance) and drive north for better mid-afternoon light on the valley views.' },
  'Old La Honda Road': { length: '10 mi', difficulty: 4, surface: 'Good', bestTime: 'Year-round', status: 'open', description: 'The Bay Area\'s legendary sports car road: 10 miles of tight, technical bends between Woodside and La Honda through second-growth redwoods. A short road with a massive following.', tip: 'Cyclists own this road — they\'re there every weekend. Find your gap patiently; there is no safe passing on the descent.' },
};

function getRoadDetails(place) {
  const custom = ROAD_DATA[place.name] || {};
  const diffMap   = { Mountain: 4, Technical: 5, Canyon: 3, Coastal: 2, Scenic: 2, Desert: 2, Historic: 1, 'Off-road': 4 };
  const surfaceMap = { Mountain: 'Good', Technical: 'Excellent', Canyon: 'Good', Coastal: 'Excellent', Scenic: 'Good', Desert: 'Good', Historic: 'Fair', 'Off-road': 'Rough' };
  const seasonMap  = { 'West Coast': 'Year-round', 'Mountain West': 'Jun–Sep', Southwest: 'Mar–May, Sep–Nov', Southeast: 'Apr–Nov', Northeast: 'May–Oct', Midwest: 'May–Oct' };
  return {
    length:      custom.length      || 'Varies',
    difficulty:  custom.difficulty  ?? (diffMap[place.type] || 3),
    surface:     custom.surface     || surfaceMap[place.type] || 'Good',
    bestTime:    custom.bestTime    || seasonMap[place.region] || 'Year-round',
    status:      custom.status      || (place.type === 'Mountain' ? 'seasonal' : 'open'),
    description: custom.description || `A ${place.type.toLowerCase()} road through the ${place.region} region, known for its driving character and scenery.`,
    tip:         custom.tip         || 'Check local conditions before heading out. Early mornings give you the road to yourself.',
  };
}

// ── Road detail modal ─────────────────────────────────────────
const roadModalOverlay = document.getElementById('roadModal');
const roadModalClose   = document.getElementById('roadModalClose');

function openRoadModal(place) {
  if (!roadModalOverlay) return;
  const d = getRoadDetails(place);
  const saved = isRoadSaved(place.name);
  const saveCount = getSavedRoads().length;
  const FREE_LIMIT = 5;
  const statusLabel = { open: 'Open', seasonal: 'Seasonal', closed: 'Closed' }[d.status] || 'Open';

  const diffSegs = Array.from({ length: 5 }, (_, i) => {
    const filled = i < d.difficulty;
    const max    = filled && i === 4;
    return `<div class="difficulty-seg${filled ? ' filled' : ''}${max ? ' max' : ''}"></div>`;
  }).join('');

  document.getElementById('roadModalInner').innerHTML = `
    <button class="road-modal-close" id="roadModalCloseBtn" aria-label="Close">&times;</button>
    <div class="road-modal-badges">
      <span class="road-type-badge">${place.type}</span>
      <span class="road-status-badge ${d.status}">${statusLabel}</span>
    </div>
    <h2 class="road-modal-name">${escapeHtml(place.name)}</h2>
    <p class="road-modal-region">${place.region}</p>
    <div class="road-modal-stats">
      <div class="road-stat">
        <span class="road-stat-value">${d.length}</span>
        <span class="road-stat-label">Length</span>
      </div>
      <div class="road-stat">
        <div class="road-stat-value"><div class="difficulty-bar">${diffSegs}</div></div>
        <span class="road-stat-label">Difficulty</span>
      </div>
      <div class="road-stat">
        <span class="road-stat-value">${d.surface}</span>
        <span class="road-stat-label">Surface</span>
      </div>
      <div class="road-stat">
        <span class="road-stat-value">${d.bestTime}</span>
        <span class="road-stat-label">Best Season</span>
      </div>
    </div>
    <p class="road-modal-description">${d.description}</p>
    <div class="road-modal-tip"><strong>Driver's Tip —</strong> ${d.tip}</div>
    <div class="road-modal-locked">
      <div class="locked-preview"></div>
      <div class="locked-label">Elevation Profile</div>
      <a href="pricing.html" class="locked-cta">Unlock with Enthusiast Plan →</a>
    </div>
    <div class="road-modal-actions">
      <button class="btn save-road-btn ${saved ? 'saved' : ''}" id="modalSaveBtn" data-name="${escapeHtml(place.name)}">
        ${saved ? '✓ Saved' : '+ Save Road'}
      </button>
      <a href="#explore" class="btn btn-primary" id="modalMapBtn">View on Map</a>
    </div>
    <div class="saved-count">You have saved <span>${saveCount}</span> / ${FREE_LIMIT} roads on the free plan. <a href="pricing.html" style="color:var(--color-primary);text-decoration:underline">Upgrade for unlimited →</a></div>
  `;

  roadModalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  document.getElementById('roadModalCloseBtn').addEventListener('click', closeRoadModal);

  const saveBtn = document.getElementById('modalSaveBtn');
  saveBtn.addEventListener('click', () => {
    const name = saveBtn.dataset.name;
    if (isRoadSaved(name)) {
      unsaveRoad(name);
      saveBtn.textContent = '+ Save Road';
      saveBtn.classList.remove('saved');
    } else {
      const saved = getSavedRoads();
      if (saved.length >= FREE_LIMIT) {
        window.location.href = 'pricing.html';
        return;
      }
      saveRoad(name);
      saveBtn.textContent = '✓ Saved';
      saveBtn.classList.add('saved');
    }
    const cnt = document.querySelector('.saved-count span');
    if (cnt) cnt.textContent = getSavedRoads().length;
  });

  document.getElementById('modalMapBtn').addEventListener('click', e => {
    closeRoadModal();
    if (atlasMap) {
      document.getElementById('explore').scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        atlasMap.flyTo([place.lat, place.lng], 11, { duration: 1.5 });
        openPopupAtLocation(place.lat, place.lng, place.name);
      }, 700);
    }
  });
}

function closeRoadModal() {
  roadModalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

if (roadModalClose) roadModalClose.addEventListener('click', closeRoadModal);
if (roadModalOverlay) roadModalOverlay.addEventListener('click', e => { if (e.target === roadModalOverlay) closeRoadModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && roadModalOverlay && roadModalOverlay.classList.contains('open')) closeRoadModal(); });

// ── Saved roads (localStorage) ────────────────────────────────
function getSavedRoads() { return JSON.parse(localStorage.getItem('atlas-saved') || '[]'); }
function saveRoad(name)   { const s = getSavedRoads(); if (!s.includes(name)) { s.push(name); localStorage.setItem('atlas-saved', JSON.stringify(s)); } }
function unsaveRoad(name) { localStorage.setItem('atlas-saved', JSON.stringify(getSavedRoads().filter(n => n !== name))); }
function isRoadSaved(name){ return getSavedRoads().includes(name); }

// ── Type filter chips ─────────────────────────────────────────
let activeFilter = 'All';
document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    activeFilter = chip.dataset.type;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    renderResultsFiltered(searchInput.value);
  });
});

function getFilteredPlaces(query) {
  const q = query.trim().toLowerCase();
  return PLACES.filter(p =>
    (activeFilter === 'All' || p.type === activeFilter) &&
    (p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.region.toLowerCase().includes(q))
  ).slice(0, 9);
}

// Re-wire search to use filtered set
function renderResultsFiltered(query) {
  const q = query.trim().toLowerCase();
  searchResults.innerHTML = '';
  if (!q && activeFilter === 'All') return;
  const matches = getFilteredPlaces(query);
  if (!matches.length) {
    searchResults.innerHTML = `<div class="search-empty">No results found. Try a different search term or filter.</div>`;
    return;
  }
  matches.forEach(place => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `View ${place.name}`);
    item.innerHTML = `
      <div class="search-result-icon">${pinIconSVG}</div>
      <div class="search-result-text">
        <div class="search-result-name">${q ? highlightMatch(place.name, q) : escapeHtml(place.name)}</div>
        <div class="search-result-type">${place.type} &middot; ${place.region}</div>
      </div>
      <span class="search-result-action">Details →</span>
    `;
    const open = () => openRoadModal(place);
    item.addEventListener('click', open);
    item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });
    searchResults.appendChild(item);
  });
}

// ── Newsletter form ───────────────────────────────────────────
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = newsletterForm.querySelector('input[type="email"]').value.trim();
    if (!email) return;
    const emails = JSON.parse(localStorage.getItem('atlas-newsletter') || '[]');
    if (!emails.includes(email)) { emails.push(email); localStorage.setItem('atlas-newsletter', JSON.stringify(emails)); }
    newsletterForm.style.display = 'none';
    document.getElementById('newsletterSuccess').classList.add('visible');
  });
}

// ── Cookie consent ────────────────────────────────────────────
const cookieBanner = document.getElementById('cookieBanner');
if (cookieBanner && !localStorage.getItem('atlas-cookie-consent')) {
  setTimeout(() => cookieBanner.classList.add('visible'), 1500);
  document.getElementById('cookieAccept').addEventListener('click', () => {
    localStorage.setItem('atlas-cookie-consent', '1');
    cookieBanner.classList.remove('visible');
  });
  document.getElementById('cookieDecline').addEventListener('click', () => {
    localStorage.setItem('atlas-cookie-consent', '0');
    cookieBanner.classList.remove('visible');
  });
}

// ── Back to top ───────────────────────────────────────────────
const backToTop = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
  backToTop.classList.toggle('visible', window.scrollY > 400);
}, { passive: true });

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ── Modals ────────────────────────────────────────────────────
const MODAL_CONTENT = {
  about: {
    title: 'About Atlas',
    body: `
      <p>Atlas is the definitive guide to America's best driving roads — built by enthusiasts, for enthusiasts. We map, rate, and document the roads that make driving worth doing.</p>
      <h4>Our Mission</h4>
      <p>There are thousands of incredible roads in America that most drivers will never discover. Atlas exists to change that. We believe the best drive of your life is still out there, and we're here to help you find it.</p>
      <h4>What We Build</h4>
      <ul>
        <li>1,200+ mapped and rated driving roads across all 50 states</li>
        <li>Real-time road condition alerts and seasonal closure tracking</li>
        <li>Elevation profiles and technical difficulty ratings</li>
        <li>Community-driven reviews from 85,000+ active drivers</li>
        <li>Offline-first maps that work in the deepest canyons</li>
      </ul>
      <h4>Our Community</h4>
      <p>Atlas is powered by a community of sports car owners, motorcycle riders, classic car enthusiasts, and anyone who believes a great road is worth going out of your way for. Every review, rating, and road report comes from real drivers who've been there.</p>
      <p style="margin-top:1.5rem;color:var(--color-text-muted);font-size:0.9rem;">Founded in 2022 &middot; Headquartered in Asheville, NC &middot; Near the Tail of the Dragon</p>
    `,
  },
  blog: {
    title: 'Blog',
    body: `
      <div class="modal-blog-list">
        <article class="modal-blog-post">
          <span class="modal-blog-date">March 20, 2026</span>
          <h4>The 10 Best Driving Roads in America for 2026</h4>
          <p>We crunched 4.2 million community reviews to find the roads that consistently blow drivers away. Number 3 will surprise you.</p>
        </article>
        <article class="modal-blog-post">
          <span class="modal-blog-date">March 5, 2026</span>
          <h4>Beartooth Highway: Everything You Need to Know</h4>
          <p>Opening dates, road conditions, the best pullouts, and why Charles Kuralt called it "the most beautiful road in America."</p>
        </article>
        <article class="modal-blog-post">
          <span class="modal-blog-date">February 18, 2026</span>
          <h4>How to Drive the Tail of the Dragon Without Getting Caught Out</h4>
          <p>318 curves in 11 miles. No guardrails on the inside. Here's how experienced drivers prepare — and what beginners get wrong.</p>
        </article>
        <article class="modal-blog-post">
          <span class="modal-blog-date">February 1, 2026</span>
          <h4>Spring Road Season Preview: What's Opening in 2026</h4>
          <p>Going-to-the-Sun, Trail Ridge Road, Beartooth — which high-altitude roads are opening early this year and which are running late.</p>
        </article>
      </div>
    `,
  },
  privacy: {
    title: 'Privacy Policy',
    body: `
      <p><em>Effective date: January 1, 2026</em></p>
      <h4>Information We Collect</h4>
      <p>Atlas collects only the information necessary to provide our services. This includes account information you provide, location data when you use navigation features (with your permission), and anonymised usage analytics to improve the product.</p>
      <h4>How We Use Your Data</h4>
      <ul>
        <li>To provide and improve Atlas services</li>
        <li>To personalise your exploration experience</li>
        <li>To send product updates you've opted in to</li>
        <li>To ensure the security of your account</li>
      </ul>
      <h4>Data Storage &amp; Security</h4>
      <p>All personal data is encrypted at rest and in transit using AES-256 and TLS 1.3. Location history is stored locally on your device by default and only synced to our servers with explicit consent.</p>
      <h4>We Never Sell Your Data</h4>
      <p>Atlas does not sell, rent, or share your personal information with third parties for marketing purposes. Full stop.</p>
      <h4>Your Rights</h4>
      <p>You may request access to, correction of, or deletion of your personal data at any time by contacting <a href="mailto:privacy@atlas.app">privacy@atlas.app</a>.</p>
      <h4>Contact</h4>
      <p>Questions? Email us at <a href="mailto:privacy@atlas.app">privacy@atlas.app</a>.</p>
    `,
  },
  terms: {
    title: 'Terms of Service',
    body: `
      <p><em>Effective date: January 1, 2026</em></p>
      <h4>Acceptance of Terms</h4>
      <p>By accessing or using Atlas, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>
      <h4>Use of Service</h4>
      <p>Atlas grants you a limited, non-exclusive, non-transferable licence to use our platform for personal, non-commercial exploration and navigation purposes.</p>
      <h4>Prohibited Activities</h4>
      <ul>
        <li>Scraping or bulk downloading of map data</li>
        <li>Using the service for commercial redistribution without a licence</li>
        <li>Attempting to reverse-engineer or compromise our systems</li>
        <li>Submitting false or misleading location data</li>
      </ul>
      <h4>Intellectual Property</h4>
      <p>All Atlas content, including maps, designs, and software, is owned by Atlas or its licensors. Map data is provided under OpenStreetMap's ODbL licence where applicable.</p>
      <h4>Limitation of Liability</h4>
      <p>Atlas is provided "as is". We are not liable for navigation errors, inaccurate map data, or any consequences of relying solely on Atlas for navigation in safety-critical situations.</p>
      <h4>Changes to Terms</h4>
      <p>We may update these terms with reasonable notice. Continued use of Atlas after updates constitutes acceptance.</p>
      <h4>Contact</h4>
      <p>Questions? Email <a href="mailto:legal@atlas.app">legal@atlas.app</a>.</p>
    `,
  },
  cookies: {
    title: 'Cookie Policy',
    body: `
      <p><em>Effective date: January 1, 2026</em></p>
      <h4>What Are Cookies</h4>
      <p>Cookies are small text files stored on your device when you visit a website. They help us remember your preferences and improve your experience.</p>
      <h4>Cookies We Use</h4>
      <table class="modal-table">
        <thead><tr><th>Cookie</th><th>Purpose</th><th>Duration</th></tr></thead>
        <tbody>
          <tr><td>atlas-theme</td><td>Remembers your light/dark mode preference</td><td>1 year</td></tr>
          <tr><td>atlas-session</td><td>Maintains your login session</td><td>Session</td></tr>
          <tr><td>atlas-prefs</td><td>Stores map display preferences</td><td>6 months</td></tr>
        </tbody>
      </table>
      <h4>Third-Party Cookies</h4>
      <p>Our map tiles are served by CARTO. They may set their own cookies subject to <a href="https://carto.com/privacy" target="_blank" rel="noopener">CARTO's Privacy Policy</a>.</p>
      <h4>Managing Cookies</h4>
      <p>You can control cookies through your browser settings. Note that disabling cookies may affect some Atlas features.</p>
      <h4>Contact</h4>
      <p>Questions? Email <a href="mailto:privacy@atlas.app">privacy@atlas.app</a>.</p>
    `,
  },
};

const modalOverlay = document.getElementById('modalOverlay');
const modalTitle   = document.getElementById('modalTitle');
const modalBody    = document.getElementById('modalBody');
const modalClose   = document.getElementById('modalClose');

function openModal(key) {
  const content = MODAL_CONTENT[key];
  if (!content) return;
  modalTitle.textContent = content.title;
  modalBody.innerHTML    = content.body;
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  modalClose.focus();
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

// Footer/nav modal links
document.querySelectorAll('[data-modal]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    openModal(link.dataset.modal);
  });
});

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal(); });
