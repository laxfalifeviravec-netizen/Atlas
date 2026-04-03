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
  europe:   { lat: 54,    lng: 15,    zoom: 4 },
  asia:     { lat: 30,    lng: 105,   zoom: 3 },
  americas: { lat: 5,     lng: -75,   zoom: 3 },
  africa:   { lat: 5,     lng: 20,    zoom: 3 },
  oceania:  { lat: -25,   lng: 140,   zoom: 3 },
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
  { name: 'Paris, France',              type: 'City',     region: 'Europe',   lat: 48.8566,  lng: 2.3522   },
  { name: 'Tokyo, Japan',               type: 'City',     region: 'Asia',     lat: 35.6762,  lng: 139.6503 },
  { name: 'New York City, USA',         type: 'City',     region: 'Americas', lat: 40.7128,  lng: -74.0060 },
  { name: 'London, UK',                 type: 'City',     region: 'Europe',   lat: 51.5074,  lng: -0.1278  },
  { name: 'Sydney, Australia',          type: 'City',     region: 'Oceania',  lat: -33.8688, lng: 151.2093 },
  { name: 'Cape Town, South Africa',    type: 'City',     region: 'Africa',   lat: -33.9249, lng: 18.4241  },
  { name: 'Rio de Janeiro, Brazil',     type: 'City',     region: 'Americas', lat: -22.9068, lng: -43.1729 },
  { name: 'Barcelona, Spain',           type: 'City',     region: 'Europe',   lat: 41.3851,  lng: 2.1734   },
  { name: 'Bali, Indonesia',            type: 'Island',   region: 'Asia',     lat: -8.3405,  lng: 115.0920 },
  { name: 'Machu Picchu, Peru',         type: 'Landmark', region: 'Americas', lat: -13.1631, lng: -72.5450 },
  { name: 'Santorini, Greece',          type: 'Island',   region: 'Europe',   lat: 36.3932,  lng: 25.4615  },
  { name: 'Marrakech, Morocco',         type: 'City',     region: 'Africa',   lat: 31.6295,  lng: -7.9811  },
  { name: 'Kyoto, Japan',               type: 'City',     region: 'Asia',     lat: 35.0116,  lng: 135.7681 },
  { name: 'Cairo, Egypt',               type: 'City',     region: 'Africa',   lat: 30.0444,  lng: 31.2357  },
  { name: 'Queenstown, New Zealand',    type: 'City',     region: 'Oceania',  lat: -45.0312, lng: 168.6626 },
  { name: 'Great Barrier Reef',         type: 'Landmark', region: 'Oceania',  lat: -18.2871, lng: 147.6992 },
  { name: 'Serengeti, Tanzania',        type: 'Park',     region: 'Africa',   lat: -2.3333,  lng: 34.8333  },
  { name: 'Amazon Rainforest',          type: 'Region',   region: 'Americas', lat: -3.4653,  lng: -62.2159 },
  { name: 'Himalayan Mountains',        type: 'Region',   region: 'Asia',     lat: 27.9881,  lng: 86.9250  },
  { name: 'Northern Lights, Iceland',   type: 'Landmark', region: 'Europe',   lat: 64.9631,  lng: -19.0208 },
  { name: 'Rome, Italy',                type: 'City',     region: 'Europe',   lat: 41.9028,  lng: 12.4964  },
  { name: 'Amsterdam, Netherlands',     type: 'City',     region: 'Europe',   lat: 52.3676,  lng: 4.9041   },
  { name: 'Prague, Czech Republic',     type: 'City',     region: 'Europe',   lat: 50.0755,  lng: 14.4378  },
  { name: 'Vienna, Austria',            type: 'City',     region: 'Europe',   lat: 48.2082,  lng: 16.3738  },
  { name: 'Dubai, UAE',                 type: 'City',     region: 'Asia',     lat: 25.2048,  lng: 55.2708  },
  { name: 'Singapore',                  type: 'City',     region: 'Asia',     lat: 1.3521,   lng: 103.8198 },
  { name: 'Bangkok, Thailand',          type: 'City',     region: 'Asia',     lat: 13.7563,  lng: 100.5018 },
  { name: 'Mumbai, India',              type: 'City',     region: 'Asia',     lat: 19.0760,  lng: 72.8777  },
  { name: 'Shanghai, China',            type: 'City',     region: 'Asia',     lat: 31.2304,  lng: 121.4737 },
  { name: 'Mexico City, Mexico',        type: 'City',     region: 'Americas', lat: 19.4326,  lng: -99.1332 },
  { name: 'Buenos Aires, Argentina',    type: 'City',     region: 'Americas', lat: -34.6037, lng: -58.3816 },
  { name: 'Vancouver, Canada',          type: 'City',     region: 'Americas', lat: 49.2827,  lng: -123.1207},
  { name: 'Nairobi, Kenya',             type: 'City',     region: 'Africa',   lat: -1.2921,  lng: 36.8219  },
  { name: 'Lagos, Nigeria',             type: 'City',     region: 'Africa',   lat: 6.5244,   lng: 3.3792   },
  { name: 'Melbourne, Australia',       type: 'City',     region: 'Oceania',  lat: -37.8136, lng: 144.9631 },
  { name: 'Petra, Jordan',              type: 'Landmark', region: 'Asia',     lat: 30.3285,  lng: 35.4444  },
  { name: 'Amalfi Coast, Italy',        type: 'Landmark', region: 'Europe',   lat: 40.6340,  lng: 14.6027  },
  { name: 'Ha Long Bay, Vietnam',       type: 'Landmark', region: 'Asia',     lat: 20.9101,  lng: 107.1839 },
  { name: 'Patagonia, Argentina',       type: 'Region',   region: 'Americas', lat: -51.6226, lng: -69.2181 },
  { name: 'Maldives',                   type: 'Island',   region: 'Asia',     lat: 3.2028,   lng: 73.2207  },
  { name: 'Zanzibar, Tanzania',         type: 'Island',   region: 'Africa',   lat: -6.1659,  lng: 39.2026  },
  { name: 'Reykjavik, Iceland',         type: 'City',     region: 'Europe',   lat: 64.1265,  lng: -21.8174 },
  { name: 'Lisbon, Portugal',           type: 'City',     region: 'Europe',   lat: 38.7223,  lng: -9.1393  },
  { name: 'Istanbul, Turkey',           type: 'City',     region: 'Europe',   lat: 41.0082,  lng: 28.9784  },
  { name: 'Havana, Cuba',               type: 'City',     region: 'Americas', lat: 23.1136,  lng: -82.3666 },
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
      <span class="search-result-action">Show on map</span>
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

    // Wire up place card clicks after map is ready
    document.querySelectorAll('.place-card').forEach(card => {
      const lat = parseFloat(card.dataset.lat);
      const lng = parseFloat(card.dataset.lng);
      const name = card.dataset.name;

      const activate = () => {
        atlasMap.flyTo([lat, lng], 10, { duration: 1.2 });
        openPopupAtLocation(lat, lng, name);
        document.querySelector('.map-wrap').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
      <p>Atlas is a modern travel exploration platform built to help adventurers, explorers, and everyday travellers navigate the world with confidence.</p>
      <h4>Our Mission</h4>
      <p>We believe that understanding geography enriches every journey. Whether you're planning a dream vacation, studying the world, or just curious about places, Atlas gives you the tools to explore freely.</p>
      <h4>What We Build</h4>
      <ul>
        <li>Interactive maps with global destination coverage</li>
        <li>Smart search across millions of locations</li>
        <li>Community-driven place discovery</li>
        <li>Offline-first navigation tools</li>
        <li>Privacy-respecting location services</li>
      </ul>
      <h4>Our Team</h4>
      <p>Atlas is built by a small, passionate team of engineers, designers, and geographers distributed across five continents — because we practice what we preach.</p>
      <p style="margin-top:1.5rem;color:var(--color-text-muted);font-size:0.9rem;">Founded in 2022 &middot; Headquartered in Lisbon, Portugal</p>
    `,
  },
  blog: {
    title: 'Blog',
    body: `
      <div class="modal-blog-list">
        <article class="modal-blog-post">
          <span class="modal-blog-date">March 18, 2026</span>
          <h4>The 10 Most Underrated Destinations of 2026</h4>
          <p>We asked our community of 2.4 million travellers which places surprised them most. The answers will inspire your next trip.</p>
        </article>
        <article class="modal-blog-post">
          <span class="modal-blog-date">February 28, 2026</span>
          <h4>How We Improved Map Accuracy by 40%</h4>
          <p>A deep dive into the data pipeline improvements that made Atlas maps more precise than ever — including how we handle remote regions.</p>
        </article>
        <article class="modal-blog-post">
          <span class="modal-blog-date">February 10, 2026</span>
          <h4>Offline Maps: A Guide to Travelling Without Data</h4>
          <p>Everything you need to know about downloading regions, managing storage, and staying navigated in the world's most remote corners.</p>
        </article>
        <article class="modal-blog-post">
          <span class="modal-blog-date">January 25, 2026</span>
          <h4>Atlas 3.0 — What's New</h4>
          <p>A full rundown of everything in our biggest release yet: new map layers, improved search, community collections, and more.</p>
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
