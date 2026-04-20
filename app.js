/* ============================================================
   Atlas — App JS
   ============================================================ */

// ── Theme Toggle ──────────────────────────────────────────────
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('atlas-theme') || 'dark';
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
  // Southeast
  { name: 'Tail of the Dragon (US-129)',     type: 'Technical', region: 'Southeast',    lat: 35.47,  lng: -83.98  },
  { name: 'Blue Ridge Parkway',              type: 'Scenic',    region: 'Southeast',    lat: 36.08,  lng: -79.50  },
  { name: 'Cherohala Skyway',                type: 'Scenic',    region: 'Southeast',    lat: 35.38,  lng: -84.20  },
  { name: 'Moonshiner 28 (NC-28)',           type: 'Technical', region: 'Southeast',    lat: 35.27,  lng: -83.42  },
  { name: 'Overseas Highway (US-1)',         type: 'Coastal',   region: 'Southeast',    lat: 24.70,  lng: -80.90  },
  { name: 'Natchez Trace Parkway',           type: 'Historic',  region: 'Southeast',    lat: 34.70,  lng: -87.70  },
  { name: 'Foothills Parkway',               type: 'Scenic',    region: 'Southeast',    lat: 35.65,  lng: -83.85  },
  { name: 'Talimena Scenic Drive',           type: 'Scenic',    region: 'Southeast',    lat: 34.63,  lng: -94.85  },
  // Northeast
  { name: 'Kancamagus Highway (NH-112)',     type: 'Scenic',    region: 'Northeast',    lat: 44.05,  lng: -71.40  },
  { name: 'Skyline Drive',                   type: 'Scenic',    region: 'Northeast',    lat: 38.50,  lng: -78.50  },
  { name: 'Vermont Route 100',               type: 'Scenic',    region: 'Northeast',    lat: 43.90,  lng: -72.90  },
  { name: 'Mohawk Trail (MA-2)',             type: 'Historic',  region: 'Northeast',    lat: 42.67,  lng: -73.00  },
  { name: 'Acadia Loop Road',                type: 'Coastal',   region: 'Northeast',    lat: 44.32,  lng: -68.22  },
  { name: 'Mount Washington Auto Road',      type: 'Mountain',  region: 'Northeast',    lat: 44.27,  lng: -71.30  },
  // Midwest
  { name: 'Ozark Highlands Scenic Byway',    type: 'Scenic',    region: 'Midwest',      lat: 35.75,  lng: -93.40  },
  { name: 'Great River Road',                type: 'Scenic',    region: 'Midwest',      lat: 44.00,  lng: -91.50  },
  { name: 'Loess Hills Parkway',             type: 'Scenic',    region: 'Midwest',      lat: 42.05,  lng: -96.05  },
  { name: 'Tunnel of Trees (M-119)',         type: 'Scenic',    region: 'Midwest',      lat: 45.45,  lng: -85.00  },
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
  searchDebounce = setTimeout(() => renderResults(searchInput.value), 200);
});
searchBtn.addEventListener('click', () => renderResults(searchInput.value));
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') renderResults(searchInput.value); });

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

// Init map once the section is near the viewport (lazy init)
const mapSection = document.getElementById('explore');
const mapObserver = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) {
    initMap();
    mapObserver.disconnect();

    // Wire up place card clicks — navigate to map.html focused on that road
    document.querySelectorAll('.place-card').forEach(card => {
      const lat  = card.dataset.lat;
      const lng  = card.dataset.lng;
      const name = card.dataset.name;

      const activate = () => {
        window.location.href = `map.html?road=${encodeURIComponent(name)}&lat=${lat}&lng=${lng}`;
      };

      card.addEventListener('click', activate);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') activate(); });
    });
  }
}, { threshold: 0.1 });
mapObserver.observe(mapSection);

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

contactForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!validateForm()) return;

  const btn = contactForm.querySelector('button[type="submit"]');
  btn.textContent = 'Sending…';
  btn.disabled = true;

  const nameVal    = document.getElementById('name').value.trim();
  const emailVal   = document.getElementById('email').value.trim();
  const subjectEl  = document.getElementById('subject');
  const subjectLabel = subjectEl.options[subjectEl.selectedIndex].text || 'General Inquiry';
  const messageVal = document.getElementById('message').value.trim();

  try {
    // Attempt to save to Supabase; fall back to mailto if config is placeholder
    if (typeof db !== 'undefined' && !SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
      await submitContact({
        name:    nameVal,
        email:   emailVal,
        subject: subjectLabel,
        message: messageVal,
      });
    } else {
      // Fallback: open email client
      const mailSubject = encodeURIComponent(`[Atlas] ${subjectLabel}`);
      const mailBody    = encodeURIComponent(`From: ${nameVal} <${emailVal}>\n\n${messageVal}`);
      window.location.href = `mailto:hello@atlas.app?subject=${mailSubject}&body=${mailBody}`;
    }

    contactForm.reset();
    document.getElementById('formSuccess').classList.add('visible');
    setTimeout(() => document.getElementById('formSuccess').classList.remove('visible'), 5000);
  } catch (err) {
    console.error('Contact form error:', err);
    // Graceful fallback on DB error
    const mailSubject = encodeURIComponent(`[Atlas] ${subjectLabel}`);
    const mailBody    = encodeURIComponent(`From: ${nameVal} <${emailVal}>\n\n${messageVal}`);
    window.location.href = `mailto:hello@atlas.app?subject=${mailSubject}&body=${mailBody}`;
  } finally {
    btn.textContent = 'Send Message';
    btn.disabled = false;
  }
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
