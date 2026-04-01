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
  const base = [
    ['Tail of the Dragon (US 129)', 'NC', 35.466, -83.92, 'Twisty mountain', 10],
    ['Pacific Coast Highway (CA-1 Big Sur)', 'CA', 36.361, -121.856, 'Scenic coastal', 9],
    ['Beartooth Highway (US 212)', 'MT', 45.005, -109.434, 'Twisty mountain', 10],
    ['Blue Ridge Parkway', 'VA', 37.18, -80.42, 'Forest canyon', 9]
  ];

  const typePool = ['Twisty mountain', 'Scenic coastal', 'Forest canyon', 'Desert sweepers'];
  const stateCoords = [
    ['CA', 36.7, -119.4], ['WA', 47.4, -120.7], ['OR', 44.1, -120.5], ['AZ', 34.2, -111.9],
    ['UT', 39.3, -111.7], ['CO', 39.1, -105.5], ['NC', 35.7, -79.5], ['TN', 35.8, -86.2],
    ['GA', 33.2, -83.4], ['VA', 37.6, -78.6], ['MT', 46.8, -110.3], ['ID', 44.3, -114.1]
  ];

  const roads = base.map(([name, state, lat, lng, type, rating]) => ({
    id: generateId(),
    name,
    state,
    lat,
    lng,
    type,
    rating,
    description: 'Verified for engaging elevation changes and rewarding corner rhythm.',
    author: 'atlas_admin',
    createdAt: new Date().toISOString()
  }));

  for (let i = 1; i <= 120; i += 1) {
    const [state, latBase, lngBase] = stateCoords[i % stateCoords.length];
    roads.push({
      id: generateId(),
      name: `Atlas Route ${String(i).padStart(3, '0')}`,
      state,
      lat: latBase + ((i % 7) - 3) * 0.15,
      lng: lngBase + ((i % 9) - 4) * 0.15,
      type: typePool[i % typePool.length],
      rating: 6 + (i % 5),
      description: `Route ${i} is known for balanced turns, low congestion windows, and strong scenery value.`,
      author: 'atlas_admin',
      createdAt: new Date().toISOString()
    });
  }

  return roads;
}

const defaultState = {
  roads: createSeedRoads(),
  users: { atlas_admin: { username: 'atlas_admin', friends: [], incomingRequests: [] } },
  messages: {},
  activeUser: null,
  selectedLocation: null
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
  profileForm: document.getElementById('profile-form'),
  profileName: document.getElementById('profile-name'),
  activeProfile: document.getElementById('active-profile'),
  friendForm: document.getElementById('friend-form'),
  friendName: document.getElementById('friend-name'),
  incomingRequests: document.getElementById('incoming-requests'),
  friendList: document.getElementById('friend-list'),
  conversationSelect: document.getElementById('conversation-select'),
  messageThread: document.getElementById('message-thread'),
  messageForm: document.getElementById('message-form'),
  messageInput: document.getElementById('message-input')
};

const map = L.map('map').setView([39.5, -98.35], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
const markerLayer = L.layerGroup().addTo(map);
let draftMarker = null;

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

function renderAtlas() {
  const q = els.atlasSearch.value.trim().toLowerCase();
  const roads = appState.roads.filter((road) => `${road.name} ${road.state} ${road.type}`.toLowerCase().includes(q));

  els.atlasGrid.innerHTML = '';
  roads.slice(0, 140).forEach((road) => {
    const card = document.createElement('article');
    card.className = 'atlas-item';
    card.innerHTML = `
      <h4>${road.name}</h4>
      <div class="meta">${road.state} • ${road.type} • ${road.rating}/10</div>
      <p>${road.description}</p>
      <div class="meta">Shared by ${road.author}</div>
    `;
    els.atlasGrid.appendChild(card);
  });
}

function renderMapFeed() {
  const q = els.roadSearch.value.trim().toLowerCase();
  const roads = appState.roads.filter((road) => `${road.name} ${road.state} ${road.type}`.toLowerCase().includes(q));

  markerLayer.clearLayers();
  els.roadList.innerHTML = '';

  roads.forEach((road) => {
    L.marker([road.lat, road.lng])
      .addTo(markerLayer)
      .bindPopup(`<strong>${road.name}</strong><br>${road.state} • ${road.type}<br>${road.rating}/10`);

    const li = document.createElement('li');
    li.innerHTML = `<strong>${road.name}</strong><br><span class="meta">${road.state} • ${road.type} • ${road.rating}/10</span>`;
    els.roadList.appendChild(li);
  });
}

function ensureUser(username) {
  const clean = username.trim().toLowerCase();
  if (!clean) return null;
  if (!appState.users[clean]) appState.users[clean] = { username: clean, friends: [], incomingRequests: [] };
  return clean;
}

function friendshipKey(a, b) {
  return [a, b].sort().join('::');
}

function renderFriends() {
  const user = appState.activeUser ? appState.users[appState.activeUser] : null;
  els.activeProfile.textContent = `Active profile: ${appState.activeUser || 'none'}`;
  els.incomingRequests.innerHTML = '';
  els.friendList.innerHTML = '';
  els.conversationSelect.innerHTML = '';
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
    li.textContent = friend;
    els.friendList.appendChild(li);

    const option = document.createElement('option');
    option.value = friend;
    option.textContent = friend;
    els.conversationSelect.appendChild(option);
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
    div.innerHTML = `<strong>${msg.from}</strong>: ${msg.text}`;
    els.messageThread.appendChild(div);
  });
}

els.atlasSearch.addEventListener('input', renderAtlas);
els.roadSearch.addEventListener('input', renderMapFeed);
els.conversationSelect.addEventListener('change', renderMessages);

els.profileForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = ensureUser(els.profileName.value);
  if (!user) return;
  appState.activeUser = user;
  saveState();
  renderFriends();
  els.profileForm.reset();
});

els.friendForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!appState.activeUser) return alert('Set a profile first.');
  const target = ensureUser(els.friendName.value);
  if (!target || target === appState.activeUser) return;

  const me = appState.users[appState.activeUser];
  if (me.friends.includes(target)) return alert('Already friends.');

  if (!appState.users[target].incomingRequests.includes(appState.activeUser)) {
    appState.users[target].incomingRequests.push(appState.activeUser);
  }
  saveState();
  renderFriends();
  els.friendForm.reset();
});

els.messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!appState.activeUser) return alert('Set a profile first.');
  const friend = els.conversationSelect.value;
  if (!friend) return alert('Choose a friend conversation first.');

  const text = els.messageInput.value.trim();
  if (!text) return;

  const key = friendshipKey(appState.activeUser, friend);
  if (!appState.messages[key]) appState.messages[key] = [];
  appState.messages[key].push({ from: appState.activeUser, text, sentAt: new Date().toISOString() });
  saveState();
  renderMessages();
  els.messageForm.reset();
});

els.roadForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!appState.selectedLocation) return alert('Select a map location first from the Map tab.');

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
});

updateCounts();
updatePickedLocation();
renderAtlas();
renderMapFeed();
renderFriends();
