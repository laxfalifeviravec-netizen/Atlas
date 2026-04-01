const STORAGE_KEY = 'enthusiast-roads-app-v2';

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function deepClone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

const seedRoads = [
  {
    id: generateId(),
    name: 'Tail of the Dragon (US 129)',
    state: 'NC',
    description: '318 curves in 11 miles; iconic technical section for experienced drivers.',
    type: 'Twisty mountain',
    rating: 10,
    lat: 35.466,
    lng: -83.92,
    author: 'atlas_admin',
    createdAt: new Date().toISOString()
  },
  {
    id: generateId(),
    name: 'Pacific Coast Highway (CA-1, Big Sur)',
    state: 'CA',
    description: 'Ocean cliffs, elevation changes, and unforgettable views.',
    type: 'Scenic coastal',
    rating: 9,
    lat: 36.361,
    lng: -121.856,
    author: 'atlas_admin',
    createdAt: new Date().toISOString()
  },
  {
    id: generateId(),
    name: 'Beartooth Highway (US 212)',
    state: 'MT',
    description: 'High-altitude switchbacks and expansive mountain scenery.',
    type: 'Twisty mountain',
    rating: 10,
    lat: 45.005,
    lng: -109.434,
    author: 'atlas_admin',
    createdAt: new Date().toISOString()
  }
];

const defaultState = {
  roads: seedRoads,
  users: {
    atlas_admin: {
      username: 'atlas_admin',
      friends: [],
      incomingRequests: []
    }
  },
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

function updatePickedLocation() {
  if (!appState.selectedLocation) {
    els.pickedCoordinates.textContent = 'No map point selected yet.';
    return;
  }

  const { lat, lng } = appState.selectedLocation;
  els.pickedCoordinates.textContent = `Selected point: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function renderRoads() {
  const query = els.roadSearch.value.trim().toLowerCase();
  const roads = appState.roads.filter((road) => {
    const haystack = `${road.name} ${road.state} ${road.type} ${road.description}`.toLowerCase();
    return haystack.includes(query);
  });

  markerLayer.clearLayers();
  els.roadList.innerHTML = '';

  roads
    .sort((a, b) => b.rating - a.rating)
    .forEach((road) => {
      const marker = L.marker([road.lat, road.lng]).addTo(markerLayer);
      marker.bindPopup(`<strong>${road.name}</strong><br>${road.state} • ${road.type}<br>Rating: ${road.rating}/10`);

      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${road.name}</strong> <small>(${road.state})</small><br>
        ${road.description}<br>
        <small>${road.type} • ${road.rating}/10 • shared by ${road.author}</small>
      `;
      els.roadList.appendChild(li);
    });
}

function ensureUser(username) {
  const clean = username.trim().toLowerCase();
  if (!clean) return null;
  if (!appState.users[clean]) {
    appState.users[clean] = { username: clean, friends: [], incomingRequests: [] };
  }
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
    const acceptBtn = document.createElement('button');
    acceptBtn.textContent = `Accept ${requester}`;
    acceptBtn.addEventListener('click', () => {
      user.incomingRequests = user.incomingRequests.filter((u) => u !== requester);
      if (!user.friends.includes(requester)) user.friends.push(requester);
      const other = appState.users[requester];
      if (other && !other.friends.includes(user.username)) other.friends.push(user.username);
      saveState();
      renderFriends();
    });
    li.appendChild(acceptBtn);
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
    els.messageThread.innerHTML = '<small>Add a friend and pick a conversation.</small>';
    return;
  }

  const key = friendshipKey(appState.activeUser, friend);
  const msgs = appState.messages[key] || [];
  msgs.forEach((msg) => {
    const row = document.createElement('div');
    row.className = `msg ${msg.from === appState.activeUser ? 'self' : 'other'}`;
    row.innerHTML = `<strong>${msg.from}</strong>: ${msg.text}<br><small>${new Date(msg.sentAt).toLocaleString()}</small>`;
    els.messageThread.appendChild(row);
  });
  els.messageThread.scrollTop = els.messageThread.scrollHeight;
}

els.roadForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!appState.selectedLocation) {
    alert('Please click the map to set a road location.');
    return;
  }

  const author = appState.activeUser || 'guest';
  appState.roads.push({
    id: generateId(),
    name: els.roadName.value.trim(),
    state: els.roadState.value.trim().toUpperCase(),
    description: els.roadDescription.value.trim(),
    type: els.roadType.value,
    rating: Number(els.roadRating.value),
    lat: appState.selectedLocation.lat,
    lng: appState.selectedLocation.lng,
    author,
    createdAt: new Date().toISOString()
  });

  els.roadForm.reset();
  appState.selectedLocation = null;
  if (draftMarker) {
    map.removeLayer(draftMarker);
    draftMarker = null;
  }

  saveState();
  updatePickedLocation();
  renderRoads();
});

els.roadSearch.addEventListener('input', renderRoads);

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
  if (!appState.activeUser) {
    alert('Set an active profile first.');
    return;
  }

  const target = ensureUser(els.friendName.value);
  if (!target || target === appState.activeUser) return;

  const me = appState.users[appState.activeUser];
  if (me.friends.includes(target)) {
    alert('Already friends.');
    return;
  }

  const targetUser = appState.users[target];
  if (!targetUser.incomingRequests.includes(appState.activeUser)) {
    targetUser.incomingRequests.push(appState.activeUser);
  }

  saveState();
  els.friendForm.reset();
  renderFriends();
});

els.conversationSelect.addEventListener('change', renderMessages);

els.messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!appState.activeUser) {
    alert('Set an active profile first.');
    return;
  }

  const friend = els.conversationSelect.value;
  if (!friend) {
    alert('Pick a friend conversation first.');
    return;
  }

  const messageText = els.messageInput.value.trim();
  if (!messageText) return;

  const key = friendshipKey(appState.activeUser, friend);
  if (!appState.messages[key]) appState.messages[key] = [];
  appState.messages[key].push({
    from: appState.activeUser,
    text: messageText,
    sentAt: new Date().toISOString()
  });

  els.messageForm.reset();
  saveState();
  renderMessages();
});

updatePickedLocation();
renderRoads();
renderFriends();
