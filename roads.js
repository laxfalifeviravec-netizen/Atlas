/* ============================================================
   Atlas — Community Roads Map JS
   ============================================================ */

const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001' : '';

let token = localStorage.getItem('atlas-token');
let currentUser = null;
let roadsMap = null;
let allRoads = [];
let roadPolylines = {};
let addModeActive = false;
let pendingPoints = [];
let pendingMarkers = [];
let pendingPolyline = null;

const DIFF_COLORS = { Easy: '#22c55e', Moderate: '#f59e0b', Hard: '#f97316', Expert: '#dc2222' };

// ── Theme ──────────────────────────────────────────────────
const savedTheme = localStorage.getItem('atlas-theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
document.getElementById('themeToggle').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('atlas-theme', next);
});

// ── Auth ───────────────────────────────────────────────────
async function loadMe() {
  if (!token) return renderNav(null);
  try {
    const res = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { token = null; localStorage.removeItem('atlas-token'); return renderNav(null); }
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
      localStorage.removeItem('atlas-token'); token = null; currentUser = null; location.reload();
    });
  }
}

// ── Map Init ───────────────────────────────────────────────
function initMap() {
  roadsMap = L.map('roadsMap', { zoomControl: true }).setView([39.5, -98.35], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors', maxZoom: 19
  }).addTo(roadsMap);

  roadsMap.on('click', onMapClick);
}

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
async function loadRoads() {
  try {
    const res = await fetch(`${API}/api/roads`);
    const { roads } = await res.json();
    allRoads = roads;
    document.getElementById('roadCount').textContent = `${roads.length} road${roads.length===1?'':'s'} mapped`;
    renderRoadList(roads);
    renderRoadPolylines(roads);
  } catch {}
}

function renderRoadList(roads) {
  const list = document.getElementById('roadsList');
  list.innerHTML = '';
  if (roads.length === 0) {
    list.innerHTML = '<p style="padding:16px;color:var(--c-text-2);font-size:13px">No roads yet. Add the first one!</p>';
    return;
  }
  roads.forEach(r => {
    const item = document.createElement('div');
    item.className = 'road-item';
    item.innerHTML = `
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
      </div>`;
    item.addEventListener('click', () => flyToRoad(r));
    list.appendChild(item);
  });
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
      </div>`;
    line.bindPopup(popupHtml);
    roadPolylines[r.id] = line;

    // Start marker
    L.circleMarker(r.points[0], {
      radius: 5, color, fillColor: color, fillOpacity: 1, weight: 2
    }).addTo(roadsMap).bindPopup(popupHtml);
  });
}

function flyToRoad(road) {
  if (!road.points || road.points.length === 0) return;
  const bounds = L.latLngBounds(road.points);
  roadsMap.fitBounds(bounds, { padding: [60, 60] });
  if (roadPolylines[road.id]) roadPolylines[road.id].openPopup();
  // Close sidebar on mobile
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
    localStorage.setItem('atlas-token', token);
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
    localStorage.setItem('atlas-token', token);
    authOverlay.classList.remove('open'); document.body.style.overflow = '';
    renderNav(currentUser);
  } catch { document.getElementById('regError').textContent = 'Network error.'; }
});

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

(async () => {
  initMap();
  await loadMe();
  await loadRoads();
})();
