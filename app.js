const STORAGE_KEY = 'enthusiast-roads-app-v3';

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function deepClone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function createSeedRoads() {
  const realRoads = [
    ['Tail of the Dragon (US 129)', 'NC', 35.466, -83.92, 'Twisty mountain', 10],
    ['Blue Ridge Parkway', 'VA', 37.2, -80.4, 'Forest canyon', 9],
    ['Skyline Drive (Shenandoah)', 'VA', 38.53, -78.35, 'Forest canyon', 8],
    ['Cherohala Skyway', 'NC', 35.36, -84.13, 'Twisty mountain', 9],
    ['Foothills Parkway', 'TN', 35.67, -83.72, 'Forest canyon', 8],
    ['Moonshiner 28 (NC 28)', 'NC', 35.13, -83.64, 'Twisty mountain', 9],
    ['Hellbender 28 (US 28)', 'NC', 35.43, -83.79, 'Twisty mountain', 9],
    ['Back of the Dragon (VA 16)', 'VA', 36.95, -81.08, 'Twisty mountain', 9],
    ['Claw of the Dragon (VA 42)', 'VA', 37.07, -80.34, 'Twisty mountain', 8],
    ['West Virginia Route 32', 'WV', 38.9, -79.52, 'Forest canyon', 8],
    ['US 33 over Shenandoah Mountain', 'WV', 38.56, -79.33, 'Twisty mountain', 8],
    ['Kancamagus Highway (NH 112)', 'NH', 44.0, -71.42, 'Forest canyon', 8],
    ['Mount Washington Auto Road', 'NH', 44.27, -71.3, 'Twisty mountain', 8],
    ['Mohawk Trail (MA Route 2)', 'MA', 42.61, -73.02, 'Forest canyon', 7],
    ['Vermont Route 100', 'VT', 43.75, -72.79, 'Forest canyon', 7],
    ['Catskill Scenic Byway (NY 28)', 'NY', 42.14, -74.55, 'Forest canyon', 7],
    ['Hawk\'s Nest (NY 97)', 'NY', 41.52, -74.99, 'Forest canyon', 8],
    ['PA Route 44 (Pennsylvania Grand Canyon)', 'PA', 41.66, -77.43, 'Forest canyon', 7],
    ['US 421 The Snake', 'TN', 36.61, -81.93, 'Twisty mountain', 9],
    ['Kentucky Route 77 (Red River Gorge)', 'KY', 37.82, -83.63, 'Forest canyon', 7],
    ['Alabama Scenic River Trailway (AL 281)', 'AL', 33.49, -86.34, 'Twisty mountain', 7],
    ['Georgia Highway 60', 'GA', 34.62, -84.17, 'Twisty mountain', 8],
    ['Richard B. Russell Scenic Highway (GA 348)', 'GA', 34.73, -83.72, 'Twisty mountain', 8],
    ['Wolf Pen Gap Road (GA 180)', 'GA', 34.76, -83.9, 'Twisty mountain', 8],
    ['Needles Highway (SD 87)', 'SD', 43.84, -103.55, 'Forest canyon', 8],
    ['Iron Mountain Road (US 16A)', 'SD', 43.78, -103.44, 'Forest canyon', 8],
    ['Spearfish Canyon Scenic Byway', 'SD', 44.38, -103.92, 'Forest canyon', 8],
    ['Beartooth Highway (US 212)', 'MT', 45.005, -109.434, 'Twisty mountain', 10],
    ['Going-to-the-Sun Road', 'MT', 48.7, -113.8, 'Twisty mountain', 9],
    ['US 93 Lost Trail Pass', 'MT', 45.69, -113.95, 'Twisty mountain', 8],
    ['Lolo Pass (US 12)', 'ID', 46.53, -114.56, 'Forest canyon', 8],
    ['Sawtooth Scenic Byway (ID 75)', 'ID', 43.9, -114.74, 'Twisty mountain', 8],
    ['Teton Pass (WY 22)', 'WY', 43.5, -110.95, 'Twisty mountain', 8],
    ['Chief Joseph Scenic Byway (WY 296)', 'WY', 44.64, -109.36, 'Twisty mountain', 9],
    ['Bighorn Scenic Byway (US 14)', 'WY', 44.28, -107.22, 'Twisty mountain', 8],
    ['Trail Ridge Road (US 34)', 'CO', 40.4, -105.74, 'Twisty mountain', 9],
    ['Peak to Peak Scenic Byway', 'CO', 39.91, -105.51, 'Twisty mountain', 8],
    ['Million Dollar Highway (US 550)', 'CO', 37.99, -107.66, 'Twisty mountain', 10],
    ['Pikes Peak Highway', 'CO', 38.84, -105.04, 'Twisty mountain', 8],
    ['Independence Pass (CO 82)', 'CO', 39.11, -106.56, 'Twisty mountain', 9],
    ['Guanella Pass Road', 'CO', 39.6, -105.71, 'Twisty mountain', 8],
    ['San Juan Skyway', 'CO', 37.4, -108.06, 'Twisty mountain', 9],
    ['Utah Scenic Byway 12', 'UT', 37.77, -111.57, 'Desert sweepers', 10],
    ['Moki Dugway (UT 261)', 'UT', 37.26, -109.93, 'Desert sweepers', 8],
    ['Kolob Terrace Road', 'UT', 37.37, -113.05, 'Desert sweepers', 8],
    ['Mirror Lake Highway (UT 150)', 'UT', 40.72, -110.92, 'Twisty mountain', 8],
    ['Burr Trail Road', 'UT', 37.96, -111.17, 'Desert sweepers', 7],
    ['Mount Lemmon Scenic Byway', 'AZ', 32.44, -110.77, 'Desert sweepers', 9],
    ['Coronado Trail Scenic Byway (US 191)', 'AZ', 33.76, -109.36, 'Twisty mountain', 9],
    ['Arizona Route 89A (Sedona to Flagstaff)', 'AZ', 35.02, -111.73, 'Desert sweepers', 8],
    ['Apache Trail (AZ 88)', 'AZ', 33.52, -111.45, 'Desert sweepers', 7],
    ['Valley of Fire Road', 'NV', 36.44, -114.51, 'Desert sweepers', 7],
    ['Red Rock Canyon Scenic Drive', 'NV', 36.13, -115.46, 'Desert sweepers', 7],
    ['Mount Charleston Scenic Byway', 'NV', 36.27, -115.67, 'Twisty mountain', 7],
    ['Lake Tahoe East Shore Drive (NV 28)', 'NV', 39.21, -119.93, 'Scenic coastal', 8],
    ['Tioga Pass Road (CA 120)', 'CA', 37.91, -119.26, 'Twisty mountain', 9],
    ['Sonora Pass (CA 108)', 'CA', 38.31, -119.63, 'Twisty mountain', 9],
    ['Ebbetts Pass (CA 4)', 'CA', 38.54, -119.81, 'Twisty mountain', 8],
    ['Monitor Pass (CA 89)', 'CA', 38.66, -119.78, 'Twisty mountain', 8],
    ['Pacific Coast Highway (CA-1 Big Sur)', 'CA', 36.361, -121.856, 'Scenic coastal', 9],
    ['Angeles Crest Highway (CA 2)', 'CA', 34.34, -118.0, 'Twisty mountain', 9],
    ['Mulholland Highway', 'CA', 34.12, -118.73, 'Twisty mountain', 8],
    ['Palomar Mountain Road (S6/S7)', 'CA', 33.34, -116.89, 'Twisty mountain', 9],
    ['Ortega Highway (CA 74)', 'CA', 33.59, -117.39, 'Twisty mountain', 7],
    ['Nacimiento-Fergusson Road', 'CA', 35.96, -121.47, 'Twisty mountain', 8],
    ['Highway 36 (Red Bluff to Fortuna)', 'CA', 40.53, -123.17, 'Twisty mountain', 10],
    ['Highway 299 (Redding to Arcata)', 'CA', 40.8, -123.32, 'Forest canyon', 8],
    ['Avenue of the Giants', 'CA', 40.54, -123.94, 'Forest canyon', 8],
    ['Oregon Coast Highway (US 101)', 'OR', 44.62, -124.06, 'Scenic coastal', 8],
    ['McKenzie Pass (OR 242)', 'OR', 44.16, -121.86, 'Twisty mountain', 9],
    ['Historic Columbia River Highway', 'OR', 45.61, -121.97, 'Forest canyon', 8],
    ['Crater Lake Rim Drive', 'OR', 42.93, -122.12, 'Twisty mountain', 8],
    ['Volcanic Legacy Scenic Byway', 'OR', 43.2, -121.78, 'Forest canyon', 7],
    ['North Cascades Highway (WA 20)', 'WA', 48.61, -120.78, 'Twisty mountain', 10],
    ['Mount Baker Highway (WA 542)', 'WA', 48.82, -121.66, 'Twisty mountain', 9],
    ['Chuckanut Drive (WA 11)', 'WA', 48.65, -122.5, 'Scenic coastal', 8],
    ['Chinook Pass (WA 410)', 'WA', 46.87, -121.52, 'Twisty mountain', 8],
    ['White Pass Scenic Byway (US 12)', 'WA', 46.64, -121.39, 'Twisty mountain', 8],
    ['Hells Canyon Scenic Byway', 'OR', 44.91, -117.23, 'Forest canyon', 8],
    ['US 95 through Hells Canyon', 'ID', 45.0, -116.31, 'Twisty mountain', 8],
    ['Enchanted Circle Scenic Byway', 'NM', 36.58, -105.45, 'Twisty mountain', 8],
    ['High Road to Taos', 'NM', 36.25, -105.87, 'Forest canyon', 7],
    ['Turquoise Trail National Scenic Byway', 'NM', 35.63, -106.1, 'Desert sweepers', 7],
    ['Geronimo Trail Scenic Byway', 'NM', 32.64, -107.76, 'Desert sweepers', 7],
    ['Twisted Sisters (RR 335/336/337)', 'TX', 29.79, -99.52, 'Desert sweepers', 9],
    ['Willow City Loop', 'TX', 30.3, -98.66, 'Desert sweepers', 7],
    ['FM 170 River Road', 'TX', 29.22, -103.91, 'Desert sweepers', 8],
    ['Pig Trail Scenic Byway (AR 23)', 'AR', 35.89, -93.83, 'Forest canyon', 8],
    ['Talimena Scenic Drive', 'AR', 34.75, -94.73, 'Forest canyon', 8],
    ['Push Mountain Road (AR 341)', 'AR', 36.08, -92.66, 'Twisty mountain', 8],
    ['Natchez Trace Parkway', 'MS', 34.1, -88.68, 'Forest canyon', 7],
    ['Bluebonnet Trail (TX FM Roads)', 'TX', 30.08, -96.4, 'Desert sweepers', 6],
    ['Overseas Highway (US 1 Keys)', 'FL', 24.71, -81.09, 'Scenic coastal', 8],
    ['A1A Scenic & Historic Coastal Byway', 'FL', 29.9, -81.31, 'Scenic coastal', 7],
    ['Tamiami Trail (US 41)', 'FL', 25.93, -81.31, 'Scenic coastal', 6],
    ['Lake Okeechobee Scenic Trail Roads', 'FL', 26.94, -80.91, 'Scenic coastal', 6],
    ['Natchez Trace Parkway Tennessee Section', 'TN', 35.72, -87.86, 'Forest canyon', 7],
    ['Newfound Gap Road (US 441)', 'TN', 35.61, -83.42, 'Twisty mountain', 8],
    ['US 64 Ocoee Scenic Byway', 'TN', 35.1, -84.39, 'Twisty mountain', 8],
    ['Red Mountain Pass (US 550)', 'CO', 37.9, -107.72, 'Twisty mountain', 9],
    ['Dallas Divide (CO 62)', 'CO', 38.0, -107.94, 'Twisty mountain', 8],
    ['Death Valley Scenic Byway (CA 190)', 'CA', 36.46, -116.87, 'Desert sweepers', 8],
    ['Joshua Tree Scenic Roads', 'CA', 33.95, -116.12, 'Desert sweepers', 7],
    ['Navajo Route 12 (Monument Valley)', 'AZ', 36.99, -110.12, 'Desert sweepers', 7],
    ['Scenic Byway 128 (Moab River Road)', 'UT', 38.67, -109.45, 'Desert sweepers', 8],
    ['US 50 Loneliest Road', 'NV', 39.5, -117.08, 'Desert sweepers', 7],
    ['Great River Road (MN/WI section)', 'MN', 44.04, -91.64, 'Forest canyon', 7],
    ['Door County Coastal Byway', 'WI', 44.9, -87.25, 'Scenic coastal', 7],
    ['Tunnel of Trees (M-119)', 'MI', 45.57, -84.92, 'Scenic coastal', 8],
    ['M-22 Leelanau Scenic Heritage Route', 'MI', 44.83, -85.92, 'Scenic coastal', 8],
    ['Hocking Hills Scenic Byway', 'OH', 39.45, -82.53, 'Forest canyon', 7],
    ['Ohio River Scenic Byway', 'OH', 38.98, -84.74, 'Forest canyon', 6],
    ['Great River Road (IA section)', 'IA', 42.5, -90.66, 'Forest canyon', 6],
    ['Peter Norbeck Scenic Byway', 'SD', 43.89, -103.56, 'Forest canyon', 8],
    ['US 1 Coastal Maine (Rockland to Bar Harbor)', 'ME', 44.04, -69.11, 'Scenic coastal', 7],
    ['Acadia Park Loop Road', 'ME', 44.34, -68.21, 'Scenic coastal', 8],
    ['Schoodic Scenic Byway', 'ME', 44.39, -68.05, 'Scenic coastal', 7],
    ['Rangeley Lakes Scenic Byway', 'ME', 44.93, -70.62, 'Forest canyon', 7],
    ['Katy Trail backroads (MO)', 'MO', 38.83, -92.5, 'Forest canyon', 6],
    ['Ozark Highlands Scenic Byway', 'MO', 36.6, -91.29, 'Forest canyon', 7],
    ['Scenic Highway 7 (AR)', 'AR', 35.92, -93.13, 'Forest canyon', 8],
    ['Red Rock Scenic Byway (AZ 179)', 'AZ', 34.79, -111.76, 'Desert sweepers', 7],
    ['US 89A Vermilion Cliffs', 'AZ', 36.73, -112.13, 'Desert sweepers', 8],
    ['Grand Mesa Scenic Byway', 'CO', 39.02, -107.96, 'Twisty mountain', 8],
    ['Mount Evans Scenic Byway', 'CO', 39.59, -105.64, 'Twisty mountain', 9],
    ['Flaming Gorge-Uintas Scenic Byway', 'UT', 40.89, -109.49, 'Twisty mountain', 8],
    ['Buffalo Bill Cody Scenic Byway', 'WY', 44.46, -109.43, 'Twisty mountain', 8],
    ['Seward Highway Turnagain Arm', 'AK', 60.89, -149.16, 'Scenic coastal', 9],
    ['Denali Highway', 'AK', 63.03, -147.58, 'Twisty mountain', 8],
    ['Pali Highway', 'HI', 21.38, -157.8, 'Scenic coastal', 7],
    ['Road to Hana (HI 360)', 'HI', 20.86, -156.17, 'Scenic coastal', 9]
  ];

  return realRoads.map(([name, state, lat, lng, type, rating]) => ({
    id: generateId(),
    name,
    state,
    lat,
    lng,
    type,
    rating,
    description: `${name} is a known enthusiast route with standout driving character and scenery.`,
    author: 'atlas_admin',
    createdAt: new Date().toISOString()
  }));
}


const defaultState = {
  roads: createSeedRoads(),
  users: { atlas_admin: { username: 'atlas_admin', password: 'atlas123', friends: [], incomingRequests: [] } },
  messages: {},
  activeUser: null,
  selectedLocation: null,
  selectedRoadIds: [],
  selectedOnlyMode: false
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return deepClone(defaultState);
  try {
    const parsed = JSON.parse(raw);
    return { ...deepClone(defaultState), ...parsed };
  } catch {
    return deepClone(defaultState);
  }
}

let appState = loadState();
const els = {
  tabs: [...document.querySelectorAll('.tab')],
  panels: [...document.querySelectorAll('.tab-panel')],
  jumpButtons: [...document.querySelectorAll('[data-jump]')],
  routeCount: document.getElementById('route-count'),
  heroRouteCount: document.getElementById('hero-route-count'),
  atlasSearch: document.getElementById('atlas-search'),
  atlasGrid: document.getElementById('atlas-grid'),
  roadForm: document.getElementById('road-form'),
  roadName: document.getElementById('road-name'),
  roadState: document.getElementById('road-state'),
  roadDescription: document.getElementById('road-description'),
  roadType: document.getElementById('road-type'),
  roadRating: document.getElementById('road-rating'),
  pickedCoordinates: document.getElementById('picked-coordinates'),
  roadList: document.getElementById('road-list'),
  roadSearch: document.getElementById('road-search'),
  fitAll: document.getElementById('fit-all'),
  centerUS: document.getElementById('center-us'),
  selectedOnly: document.getElementById('selected-only'),
  selectedRoadList: document.getElementById('selected-road-list'),
  clearSelected: document.getElementById('clear-selected'),
  signupForm: document.getElementById('signup-form'),
  signupName: document.getElementById('signup-name'),
  signupPassword: document.getElementById('signup-password'),
  signinForm: document.getElementById('signin-form'),
  signinName: document.getElementById('signin-name'),
  signinPassword: document.getElementById('signin-password'),
  signout: document.getElementById('signout'),
  activeProfile: document.getElementById('active-profile'),
  friendForm: document.getElementById('friend-form'),
  friendName: document.getElementById('friend-name'),
  incomingRequests: document.getElementById('incoming-requests'),
  friendList: document.getElementById('friend-list'),
  conversationList: document.getElementById('conversation-list'),
  conversationSelect: document.getElementById('conversation-select'),
  messageThread: document.getElementById('message-thread'),
  messageForm: document.getElementById('message-form'),
  messageInput: document.getElementById('message-input'),
  toast: document.getElementById('toast')
};


let toastTimer = null;
function showToast(message) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2200);
}

const map = L.map('map').setView([39.5, -98.35], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
const markerLayer = L.layerGroup().addTo(map);
let draftMarker = null;
els.selectedOnly.checked = Boolean(appState.selectedOnlyMode);

function setTab(tabName) {
  els.tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === tabName));
  els.panels.forEach((panel) => panel.classList.toggle('active', panel.id === `tab-${tabName}`));
  if (tabName === 'map') setTimeout(() => map.invalidateSize(), 120);
}

els.tabs.forEach((tab) => tab.addEventListener('click', () => setTab(tab.dataset.tab)));
els.jumpButtons.forEach((btn) => btn.addEventListener('click', () => setTab(btn.dataset.jump)));

map.on('click', (e) => {
  appState.selectedLocation = { lat: e.latlng.lat, lng: e.latlng.lng };
  if (draftMarker) map.removeLayer(draftMarker);
  draftMarker = L.marker(e.latlng, { draggable: true }).addTo(map);
  draftMarker.on('dragend', () => {
    const p = draftMarker.getLatLng();
    appState.selectedLocation = { lat: p.lat, lng: p.lng };
    updatePickedLocation();
    saveState();
  });
  updatePickedLocation();
  saveState();
});

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function updateCounts() {
  const count = appState.roads.length;
  els.routeCount.textContent = `${count} routes catalogued`;
  els.heroRouteCount.textContent = String(count);
}

function updatePickedLocation() {
  if (!appState.selectedLocation) {
    els.pickedCoordinates.textContent = 'Select a location in the Map tab before publishing.';
    return;
  }
  const { lat, lng } = appState.selectedLocation;
  els.pickedCoordinates.textContent = `Selected map point: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}


function openRoadOnMap(roadId) {
  const road = appState.roads.find((r) => r.id === roadId);
  if (!road) return;
  setTab('map');
  map.setView([road.lat, road.lng], 9);
  if (!appState.selectedRoadIds.includes(roadId)) {
    appState.selectedRoadIds.push(roadId);
    saveState();
  }
  renderMapFeed();
  showToast(`Opened ${road.name} on the map.`);
}

function openConversation(friend) {
  if (!friend) return;
  setTab('community');
  els.conversationSelect.value = friend;
  renderMessages();
}

function renderAtlas() {
  const q = els.atlasSearch.value.trim().toLowerCase();
  const roads = appState.roads.filter((road) => `${road.name} ${road.state} ${road.type}`.toLowerCase().includes(q));

  els.atlasGrid.innerHTML = '';
  if (!roads.length) {
    els.atlasGrid.innerHTML = '<p class="meta">No roads matched your search.</p>';
    return;
  }
  roads.slice(0, 140).forEach((road) => {
    const card = document.createElement('article');
    card.className = 'atlas-item';
    card.innerHTML = `
      <h4>${road.name}</h4>
      <div class="meta">${road.state} • ${road.type} • ${road.rating}/10</div>
      <p>${road.description}</p>
      <div class="meta">Shared by ${road.author}</div>
      <button type="button" class="outline atlas-open">View on Map</button>
    `;
    card.querySelector('.atlas-open').addEventListener('click', () => openRoadOnMap(road.id));
    els.atlasGrid.appendChild(card);
  });
}


function toggleRoadSelection(roadId) {
  if (!appState.selectedRoadIds) appState.selectedRoadIds = [];
  if (appState.selectedRoadIds.includes(roadId)) {
    appState.selectedRoadIds = appState.selectedRoadIds.filter((id) => id !== roadId);
  } else {
    appState.selectedRoadIds.push(roadId);
  }
  saveState();
  renderMapFeed();
}

function renderSelectedRoads() {
  els.selectedRoadList.innerHTML = '';
  const selected = (appState.selectedRoadIds || [])
    .map((id) => appState.roads.find((road) => road.id === id))
    .filter(Boolean);

  if (!selected.length) {
    els.selectedRoadList.innerHTML = '<li class="meta">No selected roads yet. Click markers or route cards to select.</li>';
    return;
  }

  selected.forEach((road) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${road.name}</strong><br><span class="meta">${road.state} • ${road.type}</span><br><button type="button" class="outline">Go to road</button>`;
    li.querySelector('button').addEventListener('click', () => openRoadOnMap(road.id));
    els.selectedRoadList.appendChild(li);
  });
}


function getVisibleRoads() {
  const q = els.roadSearch.value.trim().toLowerCase();
  let roads = appState.roads.filter((road) => `${road.name} ${road.state} ${road.type}`.toLowerCase().includes(q));

  if (appState.selectedOnlyMode) {
    const selected = new Set(appState.selectedRoadIds || []);
    roads = roads.filter((road) => selected.has(road.id));
  }

  return roads;
}

function fitRoadBounds(roads) {
  if (!roads.length) {
    showToast('No roads available for this view.');
    return;
  }
  const bounds = L.latLngBounds(roads.map((road) => [road.lat, road.lng]));
  map.fitBounds(bounds, { padding: [25, 25] });
}

function renderMapFeed() {
  const roads = getVisibleRoads();

  markerLayer.clearLayers();
  els.roadList.innerHTML = '';

  if (!roads.length) {
    els.roadList.innerHTML = '<li class="meta">No mapped roads found for this filter.</li>';
  }

  roads.forEach((road) => {
    const marker = L.marker([road.lat, road.lng]).addTo(markerLayer);
    marker.bindPopup(`<strong>${road.name}</strong><br>${road.state} • ${road.type}<br>${road.rating}/10`);
    marker.on('click', () => toggleRoadSelection(road.id));

    const li = document.createElement('li');
    const isActive = (appState.selectedRoadIds || []).includes(road.id);
    if (isActive) li.classList.add('active-road');
    li.innerHTML = `<strong>${road.name}</strong><br><span class="meta">${road.state} • ${road.type} • ${road.rating}/10</span>`;
    li.addEventListener('click', () => {
      map.setView([road.lat, road.lng], 8);
      marker.openPopup();
      toggleRoadSelection(road.id);
    });
    els.roadList.appendChild(li);
  });

  renderSelectedRoads();
}

function ensureUser(username, password = '') {
  const clean = username.trim().toLowerCase();
  if (!clean) return null;
  if (!appState.users[clean]) {
    appState.users[clean] = { username: clean, password, friends: [], incomingRequests: [] };
  }
  return clean;
}

function friendshipKey(a, b) {
  return [a, b].sort().join('::');
}

function renderFriends() {
  const user = appState.activeUser ? appState.users[appState.activeUser] : null;
  els.activeProfile.textContent = appState.activeUser ? `Signed in as @${appState.activeUser}` : 'Signed out';
  els.incomingRequests.innerHTML = '';
  els.friendList.innerHTML = '';
  els.conversationSelect.innerHTML = '';
  els.conversationList.innerHTML = '';
  if (!user) return;

  user.incomingRequests.forEach((requester) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = `Accept ${requester}`;
    btn.addEventListener('click', () => {
      user.incomingRequests = user.incomingRequests.filter((u) => u !== requester);
      if (!user.friends.includes(requester)) user.friends.push(requester);
      const other = appState.users[requester];
      if (other && !other.friends.includes(user.username)) other.friends.push(user.username);
      saveState();
      renderFriends();
    });
    li.appendChild(btn);
    els.incomingRequests.appendChild(li);
  });

  user.friends.forEach((friend) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>@${friend}</strong><br><button type="button" class="outline">Message</button>`;
    li.querySelector('button').addEventListener('click', () => openConversation(friend));
    els.friendList.appendChild(li);

    const option = document.createElement('option');
    option.value = friend;
    option.textContent = friend;
    els.conversationSelect.appendChild(option);

    const threadKey = friendshipKey(appState.activeUser, friend);
    const lastMsg = (appState.messages[threadKey] || []).slice(-1)[0];
    const conv = document.createElement('li');
    if (els.conversationSelect.value === friend) conv.classList.add('active-road');
    conv.innerHTML = `<strong>@${friend}</strong><br><span class="meta">${lastMsg ? lastMsg.text.slice(0, 28) : 'No messages yet'}</span>`;
    conv.addEventListener('click', () => {
      els.conversationSelect.value = friend;
      renderMessages();
      renderFriends();
    });
    els.conversationList.appendChild(conv);
  });
  renderMessages();
}

function renderMessages() {
  els.messageThread.innerHTML = '';
  if (!appState.activeUser) return;
  const friend = els.conversationSelect.value;
  if (!friend) {
    els.messageThread.innerHTML = '<p class="meta">Pick a friend conversation to begin messaging.</p>';
    return;
  }

  const key = friendshipKey(appState.activeUser, friend);
  const thread = appState.messages[key] || [];
  thread.forEach((msg) => {
    const div = document.createElement('div');
    div.className = `msg ${msg.from === appState.activeUser ? 'self' : 'other'}`;
    div.innerHTML = `${msg.text}<small>${msg.from} • ${new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>`;
    els.messageThread.appendChild(div);
  });
}

els.atlasSearch.addEventListener('input', renderAtlas);
els.roadSearch.addEventListener('input', renderMapFeed);
els.fitAll.addEventListener('click', () => fitRoadBounds(getVisibleRoads()));
els.centerUS.addEventListener('click', () => map.setView([39.5, -98.35], 4));
els.selectedOnly.addEventListener('change', (e) => {
  appState.selectedOnlyMode = e.target.checked;
  saveState();
  renderMapFeed();
  showToast(appState.selectedOnlyMode ? 'Showing selected roads only.' : 'Showing all roads.');
});
els.conversationSelect.addEventListener('change', () => {
  renderMessages();
});
els.clearSelected.addEventListener('click', () => {
  appState.selectedRoadIds = [];
  if (appState.selectedOnlyMode) {
    appState.selectedOnlyMode = false;
    els.selectedOnly.checked = false;
  }
  saveState();
  renderMapFeed();
  showToast('Cleared selected roads.');
});

els.signupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = els.signupName.value.trim().toLowerCase();
  const password = els.signupPassword.value.trim();
  if (!username || !password) return showToast('Enter username and password.');
  if (appState.users[username]) return showToast('Username already exists.');

  ensureUser(username, password);
  appState.activeUser = username;
  saveState();
  renderFriends();
  els.signupForm.reset();
  showToast(`Account created. Signed in as @${username}`);
});

els.signinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = els.signinName.value.trim().toLowerCase();
  const password = els.signinPassword.value.trim();
  const user = appState.users[username];
  if (!user || user.password !== password) return showToast('Invalid username or password.');

  appState.activeUser = username;
  saveState();
  renderFriends();
  els.signinForm.reset();
  showToast(`Welcome back @${username}`);
});

els.signout.addEventListener('click', () => {
  appState.activeUser = null;
  saveState();
  renderFriends();
  renderMessages();
  showToast('Signed out.');
});

els.friendForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!appState.activeUser) return showToast('Set a profile first.');
  const target = els.friendName.value.trim().toLowerCase();
  if (!target || target === appState.activeUser) return;
  if (!appState.users[target]) return showToast('That user does not exist yet.');

  const me = appState.users[appState.activeUser];
  if (me.friends.includes(target)) return showToast('You are already friends.');

  if (!appState.users[target].incomingRequests.includes(appState.activeUser)) {
    appState.users[target].incomingRequests.push(appState.activeUser);
  }
  saveState();
  renderFriends();
  els.friendForm.reset();
  showToast(`Friend request sent to @${target}`);
});

els.messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!appState.activeUser) return showToast('Set a profile first.');
  const friend = els.conversationSelect.value;
  if (!friend) return showToast('Choose a friend conversation first.');

  const text = els.messageInput.value.trim();
  if (!text) return;

  const key = friendshipKey(appState.activeUser, friend);
  if (!appState.messages[key]) appState.messages[key] = [];
  appState.messages[key].push({ from: appState.activeUser, text, sentAt: new Date().toISOString() });
  saveState();
  renderMessages();
  els.messageForm.reset();
  showToast('Message sent.');
});

els.roadForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!appState.selectedLocation) return showToast('Select a map location first from the Map tab.');

  appState.roads.unshift({
    id: generateId(),
    name: els.roadName.value.trim(),
    state: els.roadState.value.trim().toUpperCase(),
    description: els.roadDescription.value.trim(),
    type: els.roadType.value,
    rating: Number(els.roadRating.value),
    lat: appState.selectedLocation.lat,
    lng: appState.selectedLocation.lng,
    author: appState.activeUser || 'guest',
    createdAt: new Date().toISOString()
  });

  appState.selectedLocation = null;
  if (draftMarker) {
    map.removeLayer(draftMarker);
    draftMarker = null;
  }

  saveState();
  updateCounts();
  updatePickedLocation();
  renderAtlas();
  renderMapFeed();
  els.roadForm.reset();
  showToast('Road published to the atlas.');
});

updateCounts();
updatePickedLocation();
renderAtlas();
renderMapFeed();
renderFriends();
