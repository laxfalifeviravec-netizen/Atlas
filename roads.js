/* ============================================================
   One Culture — Community Roads Map JS
   ============================================================ */

const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001' : '';

let token = localStorage.getItem('culture-token');
let currentUser = null;
let roadsMap = null;
let roadsTileLayer = null;
let myLocMarker = null;
let allRoads = [];
let roadPolylines = {};
let addModeActive = false;
let pendingPoints = [];
let pendingMarkers = [];
let pendingPolyline = null;

// Navigation state
let navRoad = null;
let navRoute = null;
let navSteps = [];
let navCurrentStep = 0;
let navWatchId = null;
let navRouteLayer = null;
let navNavUserMarker = null;
let navStartMarker = null;
let navArrivalTime = 0;
let navTotalDistM = 0;
let navCompletedDistM = 0;
let navEtaInterval = null;
let navTrackedPoints = [];
let navLastTrackedPos = null;
let navFollowing = true;
let navLastPanTime = 0;
let destMarker = null;
let searchDebounce = null;
const roadRegistry = {};

const DIFF_COLORS = { Easy: '#22c55e', Moderate: '#f59e0b', Hard: '#f97316', Expert: '#dc2222' };

// ── Theme ──────────────────────────────────────────────────
const savedTheme = localStorage.getItem('culture-theme');
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
document.getElementById('themeToggle').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('culture-theme', next);
  if (roadsMap) applyMapTheme(roadsMap, next !== 'light');
});

// ── Auth ───────────────────────────────────────────────────
async function loadMe() {
  if (!token) return renderNav(null);
  try {
    const res = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { token = null; localStorage.removeItem('culture-token'); return renderNav(null); }
    const { user } = await res.json();
    currentUser = user; renderNav(user);
  } catch { renderNav(null); }
}

function renderNav(user) {
  const el = document.getElementById('navAuth');
  if (!el) return;
  if (!user) {
    el.innerHTML = `<button class="nav-signin-btn" id="navSignIn">Sign In</button>`;
    document.getElementById('navSignIn').addEventListener('click', openAuth);
  } else {
    const init = user.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
    el.innerHTML = `
      <span class="nav-user-btn"><div class="avatar avatar-sm">${init}</div>${user.name.split(' ')[0]}</span>
      <button class="nav-signout-btn" id="navSignOut">Sign Out</button>`;
    document.getElementById('navSignOut').addEventListener('click', () => {
      localStorage.removeItem('culture-token'); token = null; currentUser = null; location.reload();
    });
  }
}

// ── Map tile helper ────────────────────────────────────────
function isDarkTheme() {
  const t = document.documentElement.getAttribute('data-theme');
  return t ? t !== 'light' : window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function cartoTile(map, dark) {
  const url = dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  return L.tileLayer(url, {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd', maxZoom: 20,
  }).addTo(map);
}
function applyMapTheme(map, dark) {
  if (roadsTileLayer) roadsTileLayer.remove();
  roadsTileLayer = cartoTile(map, dark);
}

// ── Map Init ───────────────────────────────────────────────
function initMap() {
  roadsMap = L.map('roadsMap', { zoomControl: true }).setView([39.5, -98.35], 4);
  roadsTileLayer = cartoTile(roadsMap, isDarkTheme());

  // Auto-zoom to user's location on load
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      roadsMap.setView([lat, lng], 13);
      if (!myLocMarker) {
        myLocMarker = L.circleMarker([lat, lng], {
          radius: 9, color: '#fff', weight: 2.5, fillColor: '#2563eb', fillOpacity: 1
        }).addTo(roadsMap);
      }
    }, () => {});
  }

  // Locate-me control
  const LocateCtrl = L.Control.extend({
    onAdd(map) {
      const btn = L.DomUtil.create('button', 'map-locate-btn leaflet-bar');
      btn.title = 'Go to my location';
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="18" height="18"><circle cx="12" cy="12" r="3"/><line x1="12" y1="1" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="1" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="23" y2="12"/></svg>`;
      L.DomEvent.on(btn, 'click', ev => {
        L.DomEvent.stopPropagation(ev);
        if (!navigator.geolocation) return;
        btn.classList.add('locating');
        navigator.geolocation.getCurrentPosition(pos => {
          btn.classList.remove('locating');
          const { latitude: lat, longitude: lng } = pos.coords;
          map.setView([lat, lng], 13);
          if (myLocMarker) myLocMarker.setLatLng([lat, lng]);
          else myLocMarker = L.circleMarker([lat, lng], { radius: 9, color: '#fff', weight: 2.5, fillColor: '#2563eb', fillOpacity: 1 }).addTo(map).bindPopup('Your location');
        }, () => { btn.classList.remove('locating'); });
      });
      return btn;
    }
  });
  new LocateCtrl({ position: 'topright' }).addTo(roadsMap);

  roadsMap.on('click', onMapClick);

  // Disable map-follow if user drags during navigation
  roadsMap.on('dragstart', () => {
    if (navWatchId != null) setNavFollowing(false);
  });
}

document.getElementById('navRecenterBtn').addEventListener('click', () => {
  setNavFollowing(true);
  navLastPanTime = 0;
  if (navNavUserMarker) {
    const ll = navNavUserMarker.getLatLng();
    panToUserOffset(ll.lat, ll.lng);
  }
});

function onMapClick(e) {
  if (!addModeActive) return;
  const { lat, lng } = e.latlng;
  pendingPoints.push([lat, lng]);

  const marker = L.circleMarker([lat, lng], {
    radius: 6, color: '#dc2222', fillColor: '#dc2222', fillOpacity: 1, weight: 2
  }).addTo(roadsMap);
  pendingMarkers.push(marker);

  if (pendingPolyline) pendingPolyline.remove();
  if (pendingPoints.length >= 2) {
    pendingPolyline = L.polyline(pendingPoints, { color: '#dc2222', weight: 3, dashArray: '6 4' }).addTo(roadsMap);
  }
}

// ── Load Roads ─────────────────────────────────────────────
let curatedRoads = [];

// Snap waypoints to real roads via OSRM (browser-side, cached in localStorage)
async function snapToRoad(id, waypoints) {
  const cacheKey = `culture-road-snap-v1-${id}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  try {
    // OSRM expects lon,lat — our geometry is [lat,lng], so swap
    const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return waypoints;
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return waypoints;
    // Convert back to [lat,lng]
    const snapped = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    try { localStorage.setItem(cacheKey, JSON.stringify(snapped)); } catch {}
    return snapped;
  } catch {
    return waypoints;
  }
}

async function loadRoads() {
  try {
    const [communityRes, curatedRes] = await Promise.all([
      fetch(`${API}/api/roads`),
      fetch(`${API}/api/roads/curated`),
    ]);
    const { roads } = await communityRes.json();
    allRoads = roads;
    if (curatedRes.ok) {
      const data = await curatedRes.json();
      curatedRoads = data.roads || [];
    }
    const total = roads.length + curatedRoads.length;
    document.getElementById('roadCount').textContent = `${total} road${total===1?'':'s'} mapped`;
    renderRoadList(roads, curatedRoads);
    renderRoadPolylines(roads);
    await renderCuratedPolylines(curatedRoads);
  } catch {}
}

function renderRoadList(communityRoads, curatedList) {
  const list = document.getElementById('roadsList');
  list.innerHTML = '';

  if (curatedList && curatedList.length > 0) {
    const header = document.createElement('div');
    header.style.cssText = 'padding:8px 12px 4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--c-text-2)';
    header.textContent = 'Culture Roads';
    list.appendChild(header);

    curatedList.forEach(r => {
      const diffLabel = ['', 'Easy', 'Easy', 'Moderate', 'Hard', 'Expert'][r.difficulty] || 'Moderate';
      const cKey = `curated-${r.id}`;
      roadRegistry[cKey] = r;
      const item = document.createElement('div');
      item.className = 'road-item';
      item.innerHTML = `
        <div class="road-item-row">
          <div class="road-item-body">
            <div class="road-item-name">${esc(r.name)}</div>
            ${r.description ? `<div style="font-size:12px;color:var(--c-text-2);margin:2px 0 4px;line-height:1.4">${esc(r.description)}</div>` : ''}
            <div class="road-item-meta">
              <span class="road-diff diff-${diffLabel}">${diffLabel}</span>
              ${r.state ? `<span class="road-item-region">${esc(r.state)}</span>` : ''}
              <span style="font-size:11px;color:var(--c-text-2)">${r.length_mi} mi</span>
            </div>
          </div>
          <button class="road-nav-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            Go
          </button>
        </div>`;
      item.addEventListener('click', e => {
        if (e.target.closest('.road-nav-btn')) return;
        flyToRoad({ points: r.geometry, id: cKey, ...r });
      });
      item.querySelector('.road-nav-btn').addEventListener('click', e => {
        e.stopPropagation();
        openNavPanel(cKey);
      });
      list.appendChild(item);
    });
  }

  if (communityRoads.length > 0) {
    const header = document.createElement('div');
    header.style.cssText = 'padding:8px 12px 4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--c-text-2);margin-top:8px';
    header.textContent = 'Community Roads';
    list.appendChild(header);

    communityRoads.forEach(r => {
      const rKey = String(r.id);
      roadRegistry[rKey] = r;
      const item = document.createElement('div');
      item.className = 'road-item';
      item.innerHTML = `
        <div class="road-item-row">
          <div class="road-item-body">
            <div class="road-item-name">${esc(r.name)}</div>
            ${r.description ? `<div style="font-size:12px;color:var(--c-text-2);margin:2px 0 4px;line-height:1.4">${esc(r.description)}</div>` : ''}
            <div class="road-item-meta">
              <span class="road-diff diff-${r.difficulty}">${r.difficulty}</span>
              ${r.region ? `<span class="road-item-region">${esc(r.region)}</span>` : ''}
              <span class="road-item-likes">
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                ${r.likes||0}
              </span>
              <span class="road-item-by">by ${esc(r.submitted_by||'Driver')}</span>
            </div>
          </div>
          <button class="road-nav-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            Go
          </button>
        </div>`;
      item.addEventListener('click', e => {
        if (e.target.closest('.road-nav-btn')) return;
        flyToRoad(r);
      });
      item.querySelector('.road-nav-btn').addEventListener('click', e => {
        e.stopPropagation();
        openNavPanel(rKey);
      });
      list.appendChild(item);
    });
  }

  if (communityRoads.length === 0 && (!curatedList || curatedList.length === 0)) {
    list.innerHTML = '<p style="padding:16px;color:var(--c-text-2);font-size:13px">No roads yet. Add the first one!</p>';
  }
}

function renderRoadPolylines(roads) {
  // Clear old
  Object.values(roadPolylines).forEach(p => p.remove());
  roadPolylines = {};

  roads.forEach(r => {
    if (!r.points || r.points.length < 2) return;
    const color = DIFF_COLORS[r.difficulty] || '#dc2222';
    const line = L.polyline(r.points, { color, weight: 4, opacity: 0.85 }).addTo(roadsMap);

    const popupHtml = `
      <div class="road-popup">
        <h4>${esc(r.name)}</h4>
        ${r.description ? `<p>${esc(r.description)}</p>` : ''}
        <div class="popup-meta">
          <span class="road-diff diff-${r.difficulty}">${r.difficulty}</span>
          ${r.region ? `<span style="font-size:11px;color:#888">${esc(r.region)}</span>` : ''}
        </div>
        <p style="font-size:11px;color:#888;margin-top:4px">by ${esc(r.submitted_by||'Driver')} · ♥ ${r.likes||0}</p>
        <button class="nav-popup-btn" onclick="window.openNavPanel('${r.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          Navigate
        </button>
      </div>`;
    line.bindPopup(popupHtml);
    roadPolylines[r.id] = line;

    // Start marker
    L.circleMarker(r.points[0], {
      radius: 5, color, fillColor: color, fillOpacity: 1, weight: 2
    }).addTo(roadsMap).bindPopup(popupHtml);
  });
}

const CURATED_DIFF_COLORS = { 1: '#22c55e', 2: '#22c55e', 3: '#f59e0b', 4: '#f97316', 5: '#dc2222' };
let curatedPolylines = {};

async function renderCuratedPolylines(roads) {
  Object.values(curatedPolylines).forEach(p => p.remove());
  curatedPolylines = {};

  // Snap all roads to real roads in batches of 4 to avoid rate-limiting
  const BATCH = 4;
  for (let i = 0; i < roads.length; i += BATCH) {
    const batch = roads.slice(i, i + BATCH);
    await Promise.all(batch.map(async r => {
      if (!r.geometry || r.geometry.length < 2) return;
      const snapped = await snapToRoad(r.id, r.geometry);
      r._snappedGeometry = snapped;
    }));
    // Small pause between batches to be polite to OSRM
    if (i + BATCH < roads.length) await new Promise(res => setTimeout(res, 300));
  }

  roads.forEach(r => {
    if (!r.geometry || r.geometry.length < 2) return;
    const pts = r._snappedGeometry || r.geometry;
    const color = CURATED_DIFF_COLORS[r.difficulty] || '#dc2222';
    const diffLabel = ['', 'Easy', 'Easy', 'Moderate', 'Hard', 'Expert'][r.difficulty] || 'Moderate';
    const line = L.polyline(pts, { color, weight: 5, opacity: 0.9 }).addTo(roadsMap);

    const popupHtml = `
      <div class="road-popup">
        <h4>${esc(r.name)}</h4>
        ${r.description ? `<p>${esc(r.description)}</p>` : ''}
        <div class="popup-meta">
          <span class="road-diff diff-${diffLabel}">${diffLabel}</span>
          ${r.state ? `<span style="font-size:11px;color:#888">${esc(r.state)}</span>` : ''}
        </div>
        <p style="font-size:11px;color:#888;margin-top:4px">${r.length_mi} mi · ${r.type}</p>
        <button class="nav-popup-btn" onclick="window.openNavPanel('curated-${r.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          Navigate
        </button>
      </div>`;
    line.bindPopup(popupHtml);
    curatedPolylines[`curated-${r.id}`] = line;

    L.circleMarker(pts[0], {
      radius: 5, color, fillColor: color, fillOpacity: 1, weight: 2
    }).addTo(roadsMap).bindPopup(popupHtml);
  });
}

function flyToRoad(road) {
  const pts = road._snappedGeometry || road.points || road.geometry;
  if (!pts || pts.length === 0) return;
  const bounds = L.latLngBounds(pts);
  roadsMap.fitBounds(bounds, { padding: [60, 60] });
  const poly = roadPolylines[road.id] || curatedPolylines[road.id];
  if (poly) poly.openPopup();
  document.getElementById('roadsSidebar').classList.remove('open');
}

// ── Add Road Mode ──────────────────────────────────────────
document.getElementById('addRoadBtn').addEventListener('click', () => {
  if (!currentUser) return openAuth();
  enterAddMode();
});

document.getElementById('cancelAddRoadBtn').addEventListener('click', cancelAddMode);
document.getElementById('doneAddRoadBtn').addEventListener('click', () => {
  if (pendingPoints.length < 2) { alert('Click at least 2 points on the map to define the road.'); return; }
  cancelAddMode(false);
  document.getElementById('addRoadOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
});

function enterAddMode() {
  addModeActive = true;
  pendingPoints = []; pendingMarkers = []; pendingPolyline = null;
  document.getElementById('addModeHint').style.display = 'flex';
  document.getElementById('addRoadBtn').style.display = 'none';
  roadsMap.getContainer().style.cursor = 'crosshair';
}

function cancelAddMode(clearPending = true) {
  addModeActive = false;
  document.getElementById('addModeHint').style.display = 'none';
  document.getElementById('addRoadBtn').style.display = '';
  roadsMap.getContainer().style.cursor = '';
  if (clearPending) {
    pendingMarkers.forEach(m => m.remove()); pendingMarkers = [];
    if (pendingPolyline) { pendingPolyline.remove(); pendingPolyline = null; }
    pendingPoints = [];
  }
}

document.getElementById('addRoadClose').addEventListener('click', () => {
  document.getElementById('addRoadOverlay').classList.remove('open');
  document.body.style.overflow = '';
  cancelAddMode(true);
});

document.getElementById('submitRoadBtn').addEventListener('click', async () => {
  const name = document.getElementById('roadName').value.trim();
  const err  = document.getElementById('addRoadError');
  if (!name) { err.textContent = 'Road name is required.'; return; }
  if (pendingPoints.length < 2) { err.textContent = 'No map points. Go back and click the map.'; return; }
  err.textContent = '';

  try {
    const res = await fetch(`${API}/api/roads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        region: document.getElementById('roadRegion').value,
        difficulty: document.getElementById('roadDifficulty').value,
        description: document.getElementById('roadDesc').value.trim(),
        points: pendingPoints,
      }),
    });
    const data = await res.json();
    if (!res.ok) { err.textContent = data.error; return; }

    // Clean up pending markers & show the new road
    pendingMarkers.forEach(m => m.remove()); pendingMarkers = [];
    if (pendingPolyline) { pendingPolyline.remove(); pendingPolyline = null; }
    pendingPoints = [];

    document.getElementById('addRoadOverlay').classList.remove('open');
    document.body.style.overflow = '';
    ['roadName','roadDesc'].forEach(id => document.getElementById(id).value = '');

    await loadRoads();
    flyToRoad(data.road);
  } catch { err.textContent = 'Failed to save road.'; }
});

// ── Sidebar mobile toggle ──────────────────────────────────
document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.getElementById('roadsSidebar').classList.toggle('open');
});

// ── Auth Modal ─────────────────────────────────────────────
const authOverlay = document.getElementById('authOverlay');
let authMode = 'login';
function openAuth() { authOverlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
document.getElementById('authClose').addEventListener('click', () => { authOverlay.classList.remove('open'); document.body.style.overflow = ''; });
authOverlay.addEventListener('click', e => { if (e.target === authOverlay) { authOverlay.classList.remove('open'); document.body.style.overflow = ''; } });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    authOverlay.classList.remove('open');
    document.getElementById('addRoadOverlay').classList.remove('open');
    document.body.style.overflow = '';
    cancelAddMode(true);
  }
});

document.getElementById('authSwitchBtn').addEventListener('click', () => {
  authMode = authMode === 'login' ? 'register' : 'login';
  document.getElementById('loginForm').style.display  = authMode === 'login' ? '' : 'none';
  document.getElementById('registerForm').style.display = authMode === 'register' ? '' : 'none';
  document.getElementById('authTitle').textContent = authMode === 'login' ? 'Sign In' : 'Create Account';
  document.getElementById('authSwitchText').textContent = authMode === 'login' ? 'Don\'t have an account?' : 'Already have one?';
  document.getElementById('authSwitchBtn').textContent = authMode === 'login' ? 'Sign Up' : 'Sign In';
});

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  ['loginEmailError','loginPasswordError','loginError'].forEach(id => document.getElementById(id).textContent = '');
  try {
    const res = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) { document.getElementById('loginError').textContent = data.error; return; }
    token = data.token; currentUser = data.user;
    localStorage.setItem('culture-token', token);
    authOverlay.classList.remove('open'); document.body.style.overflow = '';
    renderNav(currentUser);
  } catch { document.getElementById('loginError').textContent = 'Network error.'; }
});

document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  ['regNameError','regEmailError','regPasswordError','regError'].forEach(id => document.getElementById(id).textContent = '');
  try {
    const res = await fetch(`${API}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
    const data = await res.json();
    if (!res.ok) { document.getElementById('regError').textContent = data.error; return; }
    token = data.token; currentUser = data.user;
    localStorage.setItem('culture-token', token);
    authOverlay.classList.remove('open'); document.body.style.overflow = '';
    renderNav(currentUser);
  } catch { document.getElementById('regError').textContent = 'Network error.'; }
});

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── Navigation ──────────────────────────────────────────────

function openNavPanel(roadId) {
  const road = roadRegistry[String(roadId)];
  if (!road) return;
  navRoad = road;
  navRoute = null;

  const pts = road._snappedGeometry || road.points || road.geometry;
  const diff = road.difficulty
    ? (typeof road.difficulty === 'number' ? (['','Easy','Easy','Moderate','Hard','Expert'][road.difficulty] || 'Moderate') : road.difficulty)
    : 'Moderate';

  document.getElementById('navPanelName').textContent = road.name;
  const diffEl = document.getElementById('navPanelDiff');
  diffEl.textContent = diff;
  diffEl.className = `road-diff diff-${diff}`;
  document.getElementById('navRoadLen').textContent = road.length_mi ? `${road.length_mi} mi` : '—';
  document.getElementById('navDistToStart').textContent = '…';
  document.getElementById('navETA').textContent = '…';
  document.getElementById('navDistLabel').textContent = road._isDestination ? 'to destination' : 'to start';

  document.getElementById('navPanel').classList.add('open');

  if (pts && pts.length) {
    const [rlat, rlng] = pts[0];
    document.getElementById('navGoogleMaps').onclick = () =>
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${rlat},${rlng}&travelmode=driving`);
    document.getElementById('navAppleMaps').onclick = () =>
      window.open(`http://maps.apple.com/?daddr=${rlat},${rlng}&dirflg=d`);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${rlng},${rlat}?steps=true&overview=full&geometries=geojson`,
            { signal: AbortSignal.timeout(8000) }
          );
          if (!res.ok) throw new Error();
          const data = await res.json();
          if (data.code === 'Ok' && data.routes?.[0]) {
            navRoute = data.routes[0];
            const distMi = (navRoute.distance / 1609.34).toFixed(1);
            const mins = Math.round(navRoute.duration / 60);
            document.getElementById('navDistToStart').textContent = `${distMi} mi`;
            document.getElementById('navETA').textContent =
              mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
          }
        } catch {
          document.getElementById('navDistToStart').textContent = '—';
          document.getElementById('navETA').textContent = '—';
        }
      }, () => {
        document.getElementById('navDistToStart').textContent = '—';
        document.getElementById('navETA').textContent = '—';
      });
    }
  }
}
window.openNavPanel = openNavPanel;

function startNavigation() {
  if (!navRoad) return;
  document.getElementById('navPanel').classList.remove('open');

  const pts = navRoad._snappedGeometry || navRoad.points || navRoad.geometry;
  document.body.classList.add('nav-active');
  document.getElementById('navHUD').classList.add('active');
  document.getElementById('navTopCard').classList.add('active');
  setNavFollowing(true);
  navLastPanTime = 0;

  // Init ETA and tracked route
  navTrackedPoints = [];
  navLastTrackedPos = null;
  if (navRoute) {
    navTotalDistM = navRoute.distance;
    navCompletedDistM = 0;
    navArrivalTime = Date.now() + navRoute.duration * 1000;
    updateETA();
    if (navEtaInterval) clearInterval(navEtaInterval);
    navEtaInterval = setInterval(updateETA, 20000);
  }

  if (navRoute && pts) {
    const routeCoords = navRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    if (navRouteLayer) navRouteLayer.remove();
    navRouteLayer = L.polyline(routeCoords, { color: '#2563eb', weight: 5, opacity: 0.9 }).addTo(roadsMap);

    roadsMap.fitBounds(L.latLngBounds([...routeCoords, ...pts]), { padding: [60, 100] });
    setTimeout(() => roadsMap.setZoom(16), 600);

    navSteps = (navRoute.legs[0]?.steps || []).map(step => ({
      instruction: formatNavManeuver(step.maneuver, step.name),
      distance: step.distance,
      type: step.maneuver.type,
      modifier: step.maneuver.modifier,
      location: step.maneuver.location,
    }));
    navCurrentStep = 0;
    updateNavHUD();
  } else if (pts) {
    roadsMap.fitBounds(L.latLngBounds(pts), { padding: [60, 60] });
    document.getElementById('navHUDInstruction').textContent = 'Head to road start';
    document.getElementById('navHUDArrow').innerHTML = getNavArrowSVG('depart', 'straight');
    document.getElementById('navHUDDist').textContent = '';
  }

  if (pts && pts.length) {
    if (navStartMarker) navStartMarker.remove();
    navStartMarker = L.marker(pts[0], {
      icon: L.divIcon({
        className: '',
        html: `<div class="nav-flag-pin">▶</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
    }).addTo(roadsMap);
  }

  if (navigator.geolocation) {
    navWatchId = navigator.geolocation.watchPosition(onNavPosition, null, {
      enableHighAccuracy: true, maximumAge: 2000, timeout: 10000,
    });
  }
}

function onNavPosition(pos) {
  const { latitude: lat, longitude: lng, speed, heading } = pos.coords;

  if (!navNavUserMarker) {
    navNavUserMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: '',
        html: `<div class="nav-user-wrap"><div class="nav-user-halo"></div><div class="nav-user-chevron"><svg viewBox="0 0 12 12" width="12" height="12" fill="white"><polygon points="6,1 10,10 6,7.5 2,10"/></svg></div></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      })
    }).addTo(roadsMap);
  } else {
    navNavUserMarker.setLatLng([lat, lng]);
  }

  // Rotate chevron toward heading
  if (heading != null) {
    const el = navNavUserMarker.getElement();
    if (el) {
      const chevron = el.querySelector('.nav-user-chevron');
      if (chevron) chevron.style.transform = `rotate(${heading}deg)`;
    }
  }

  // Keep user at ~67% from top
  panToUserOffset(lat, lng);

  if (myLocMarker) myLocMarker.setLatLng([lat, lng]);

  // Speed display (m/s → mph)
  const mph = speed != null && speed >= 0 ? Math.round(speed * 2.237) : null;
  document.getElementById('navSpeedVal').textContent = mph != null ? mph : '—';

  // Record GPS trace for save-route
  if (!navLastTrackedPos) {
    navTrackedPoints.push([lat, lng]);
    navLastTrackedPos = [lat, lng];
  } else {
    const moved = roadsMap.distance([lat, lng], navLastTrackedPos);
    if (moved > 25) {
      navTrackedPoints.push([lat, lng]);
      navLastTrackedPos = [lat, lng];
      // Update completed distance estimate
      navCompletedDistM = Math.min(navCompletedDistM + moved, navTotalDistM);
    }
  }

  // Advance turn step
  if (navSteps.length > 0 && navCurrentStep < navSteps.length - 1) {
    const step = navSteps[navCurrentStep];
    if (step.location) {
      const [sLng, sLat] = step.location;
      const dist = roadsMap.distance([lat, lng], [sLat, sLng]);
      if (dist < 50) { navCurrentStep++; updateNavHUD(); }
    }
  }
}

function updateETA() {
  const remainM = Math.max(0, navTotalDistM - navCompletedDistM);
  const distMi = (remainM / 1609.34).toFixed(1);
  document.getElementById('navRemainDist').textContent = `${distMi} mi`;
  if (navArrivalTime > 0) {
    const arrival = new Date(navArrivalTime);
    document.getElementById('navArriveTime').textContent =
      arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const minsLeft = Math.max(0, Math.round((navArrivalTime - Date.now()) / 60000));
    document.getElementById('navRemainTime').textContent =
      minsLeft >= 60 ? `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m` : `${minsLeft} min`;
  }
}

function updateNavHUD() {
  const step = navSteps[navCurrentStep];
  const arrowEl = document.getElementById('navHUDArrow');
  if (!step || navCurrentStep >= navSteps.length - 1) {
    document.getElementById('navHUDInstruction').textContent = 'Arrive at destination';
    document.getElementById('navHUDDist').textContent = '';
    arrowEl.innerHTML = getNavArrowSVG('arrive', null);
    return;
  }
  document.getElementById('navHUDInstruction').textContent = step.instruction;
  const m = step.distance;
  document.getElementById('navHUDDist').textContent =
    m < 161 ? `${Math.round(m * 3.281)} ft` : `${(m / 1609.34).toFixed(1)} mi`;
  arrowEl.innerHTML = getNavArrowSVG(step.type, step.modifier);
}

function formatNavManeuver(m, streetName) {
  const street = streetName ? ` onto ${streetName}` : '';
  if (m.type === 'depart') return `Head ${m.modifier || 'north'}${street}`;
  if (m.type === 'arrive') return 'Arrive at destination';
  if (m.type === 'turn') return `Turn ${m.modifier || ''}${street}`;
  if (m.type === 'continue' || m.type === 'new name') return `Continue${street}`;
  if (m.type === 'merge') return `Merge ${m.modifier || ''}${street}`;
  if (m.type === 'ramp' || m.type === 'on ramp') return `Take ramp${m.modifier ? ` ${m.modifier}` : ''}${street}`;
  if (m.type === 'fork') return `Keep ${m.modifier || 'left'}${street}`;
  if (m.type === 'roundabout' || m.type === 'rotary') return 'Enter roundabout';
  if (m.type === 'exit roundabout') return `Exit roundabout${street}`;
  return m.type || 'Continue';
}

function getNavArrowSVG(type, modifier) {
  if (type === 'arrive') {
    return `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><polyline points="9 12 11 14 15 10"/></svg>`;
  }
  if (!modifier || modifier === 'straight') {
    return `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`;
  }
  if (modifier === 'left') {
    return `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M5 12l7-7M5 12l7 7"/></svg>`;
  }
  if (modifier === 'right') {
    return `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M19 12l-7-7M19 12l-7 7"/></svg>`;
  }
  if (modifier === 'slight left') {
    return `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V8M12 8l-6 6M12 8h6"/></svg>`;
  }
  if (modifier === 'slight right') {
    return `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V8M12 8l6 6M12 8H6"/></svg>`;
  }
  if (modifier === 'sharp left') {
    return `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 5H7v10M7 15l-4-4 4-4"/></svg>`;
  }
  if (modifier === 'sharp right') {
    return `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5h10v10M17 15l4-4-4-4"/></svg>`;
  }
  if (modifier === 'uturn') {
    return `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 17V9a5 5 0 0 0-10 0v8M7 17l-4-4 4-4"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`;
}

function panToUserOffset(lat, lng) {
  if (!navFollowing) return;
  const now = Date.now();
  if (now - navLastPanTime < 900) return;
  navLastPanTime = now;
  const mapSize = roadsMap.getSize();
  const zoom = roadsMap.getZoom();
  const pt = roadsMap.project([lat, lng], zoom);
  pt.y -= mapSize.y * 0.17;
  const newCenter = roadsMap.unproject(pt, zoom);
  roadsMap.setView(newCenter, zoom, { animate: true, pan: { duration: 0.5 } });
}

function setNavFollowing(val) {
  navFollowing = val;
  const btn = document.getElementById('navRecenterBtn');
  if (btn) btn.style.display = val ? 'none' : 'flex';
}

function stopNavigation() {
  if (navWatchId != null) { navigator.geolocation.clearWatch(navWatchId); navWatchId = null; }
  if (navEtaInterval) { clearInterval(navEtaInterval); navEtaInterval = null; }
  if (navRouteLayer) { navRouteLayer.remove(); navRouteLayer = null; }
  if (navStartMarker) { navStartMarker.remove(); navStartMarker = null; }
  if (navNavUserMarker) { navNavUserMarker.remove(); navNavUserMarker = null; }
  document.body.classList.remove('nav-active');
  document.getElementById('navHUD').classList.remove('active');
  document.getElementById('navTopCard').classList.remove('active');
  setNavFollowing(false);
  document.getElementById('navRecenterBtn').style.display = 'none';

  const r = navRoad;
  const tracked = navTrackedPoints.slice();
  navRoad = null; navRoute = null; navSteps = []; navCurrentStep = 0;
  navArrivalTime = 0; navTotalDistM = 0; navCompletedDistM = 0;
  navTrackedPoints = []; navLastTrackedPos = null;

  // Offer to save if user drove a meaningful distance
  if (tracked.length >= 5 && currentUser) {
    let totalM = 0;
    for (let i = 1; i < tracked.length; i++) totalM += roadsMap.distance(tracked[i - 1], tracked[i]);
    if (totalM > 500) {
      const miles = (totalM / 1609.34).toFixed(1);
      document.getElementById('saveRouteMiles').textContent = miles;
      document.getElementById('saveRouteName').value = '';
      document.getElementById('saveRouteError').textContent = '';
      document.getElementById('saveRoutePanel').classList.add('open');
      document.getElementById('saveRoutePanel')._tracked = tracked;
      return;
    }
  }
  if (r) flyToRoad(r);
}

// ── Map Search ──────────────────────────────────────────────

document.getElementById('mapSearchInput').addEventListener('input', e => {
  const q = e.target.value.trim();
  document.getElementById('mapSearchClear').style.display = q ? '' : 'none';
  clearTimeout(searchDebounce);
  if (q.length < 2) { hideSearchDropdown(); return; }
  searchDebounce = setTimeout(() => nominatimSearch(q), 400);
});

document.getElementById('mapSearchInput').addEventListener('focus', () => {
  const q = document.getElementById('mapSearchInput').value.trim();
  if (q.length >= 2) nominatimSearch(q);
});

document.getElementById('mapSearchClear').addEventListener('click', () => {
  document.getElementById('mapSearchInput').value = '';
  document.getElementById('mapSearchClear').style.display = 'none';
  hideSearchDropdown();
  if (destMarker) { destMarker.remove(); destMarker = null; }
  if (navRouteLayer) { navRouteLayer.remove(); navRouteLayer = null; }
});

document.addEventListener('click', e => {
  if (!document.getElementById('mapSearchWrap').contains(e.target)) hideSearchDropdown();
});

async function nominatimSearch(q) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
      { headers: { 'Accept-Language': 'en' }, signal: AbortSignal.timeout(6000) }
    );
    renderSearchDropdown(await res.json());
  } catch { hideSearchDropdown(); }
}

function renderSearchDropdown(results) {
  const el = document.getElementById('mapSearchResults');
  el.innerHTML = '';
  if (!results.length) {
    el.innerHTML = '<div class="search-no-results">No places found</div>';
    el.style.display = 'block'; return;
  }
  results.forEach(r => {
    const parts = r.display_name.split(',');
    const name = parts[0].trim();
    const addr = parts.slice(1, 3).join(',').trim();
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <div style="min-width:0">
        <div class="search-result-name">${esc(name)}</div>
        <div class="search-result-addr">${esc(addr)}</div>
      </div>`;
    item.addEventListener('click', () => selectSearchResult(r, name));
    el.appendChild(item);
  });
  el.style.display = 'block';
}

function hideSearchDropdown() {
  document.getElementById('mapSearchResults').style.display = 'none';
}

function selectSearchResult(place, name) {
  hideSearchDropdown();
  document.getElementById('mapSearchInput').value = name;
  document.getElementById('mapSearchClear').style.display = '';

  const lat = parseFloat(place.lat);
  const lng = parseFloat(place.lon);

  // Destination pin
  if (destMarker) destMarker.remove();
  destMarker = L.marker([lat, lng], {
    icon: L.divIcon({
      className: '',
      html: `<div class="nav-flag-pin" style="font-size:16px">📍</div>`,
      iconSize: [32, 32], iconAnchor: [16, 32],
    })
  }).addTo(roadsMap).bindPopup(esc(name)).openPopup();

  roadsMap.setView([lat, lng], 13);

  // Open nav panel using a synthetic destination road
  roadRegistry['_dest'] = { name, points: [[lat, lng]], _isDestination: true };
  openNavPanel('_dest');
}

// ── Save route ──────────────────────────────────────────────

document.getElementById('saveRouteSubmit').addEventListener('click', async () => {
  const name = document.getElementById('saveRouteName').value.trim();
  const err  = document.getElementById('saveRouteError');
  if (!name) { err.textContent = 'Give this road a name.'; return; }
  const pts  = document.getElementById('saveRoutePanel')._tracked;
  if (!pts || pts.length < 2) { err.textContent = 'Not enough GPS points.'; return; }
  err.textContent = '';

  try {
    const res = await fetch(`${API}/api/roads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        difficulty: document.getElementById('saveRouteDiff').value,
        points: pts,
      }),
    });
    const data = await res.json();
    if (!res.ok) { err.textContent = data.error || 'Failed to save.'; return; }
    document.getElementById('saveRoutePanel').classList.remove('open');
    await loadRoads();
    flyToRoad(data.road);
  } catch { err.textContent = 'Failed to save road.'; }
});

document.getElementById('saveRouteSkip').addEventListener('click', () => {
  document.getElementById('saveRoutePanel').classList.remove('open');
});

// ── Nav panel / HUD buttons ─────────────────────────────────

document.getElementById('navStartBtn').addEventListener('click', startNavigation);
document.getElementById('navStopBtn').addEventListener('click', stopNavigation);
document.getElementById('navPanelClose').addEventListener('click', () => {
  document.getElementById('navPanel').classList.remove('open');
  navRoad = null; navRoute = null;
});
document.getElementById('navPanel').addEventListener('click', e => {
  if (e.target === document.getElementById('navPanel')) {
    document.getElementById('navPanel').classList.remove('open');
    navRoad = null; navRoute = null;
  }
});

(async () => {
  initMap();
  await loadMe();
  await loadRoads();
})();
