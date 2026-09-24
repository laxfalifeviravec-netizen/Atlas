/* ============================================================
   One Culture — Groups JS (live GPS driving groups)
   ============================================================ */

const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001' : '';

let token = localStorage.getItem('culture-token');
let currentUser = null;
let groupMap = null;
let groupTileLayer = null;
let memberMarkers = {};
let destMarker = null;
let destLines = [];
let pickingDest = false;
let gpsInterval = null;
let currentGroupId = null;
let locationPoll = null;

// Run-mode state
let runMap = null;
let runTileLayer = null;
let runMemberMarkers = {};
let runDestMarker = null;
let runDestLines = [];
let runGpsInterval = null;
let runPollInterval = null;
let runGroupId = null;

// ── Theme ──────────────────────────────────────────────────
const savedTheme = localStorage.getItem('culture-theme');
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
document.getElementById('themeToggle')?.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('culture-theme', next);
  if (groupMap) applyMapTheme(groupMap, next !== 'light');
  if (runMap) applyMapTheme(runMap, next !== 'light');
});

// ── Map tile helper ────────────────────────────────────────
function isDarkTheme() {
  const t = document.documentElement.getAttribute('data-theme');
  return t ? t !== 'light' : window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function osmTile(map) {
  return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);
}
function applyMapTheme(map, dark) {
  map.getContainer().classList.toggle('dark-tiles', dark);
}

function memberDivIcon(initials, isMe, heading) {
  const color = isMe ? '#dc2222' : '#1a73e8';
  const h = (heading !== null && heading !== undefined && !isNaN(heading)) ? heading : null;
  const arrow = h !== null ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(${h}deg);width:44px;height:44px;pointer-events:none"><svg viewBox="0 0 44 44" width="44" height="44"><polygon points="22,4 28,30 22,25 16,30" fill="${color}" opacity="0.85"/></svg></div>` : '';
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:44px;height:44px">${arrow}<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:${color};color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:Barlow Condensed,sans-serif;font-weight:700;font-size:13px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)">${initials}</div></div>`,
    iconSize: [44, 44], iconAnchor: [22, 22],
  });
}

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

// ── Load Groups ────────────────────────────────────────────
async function loadGroups() {
  const list = document.getElementById('groupsList');
  try {
    const res = await fetch(`${API}/api/groups`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const { groups } = await res.json();
    list.innerHTML = '';
    if (groups.length === 0) {
      list.innerHTML = `<div class="feed-empty"><p>No groups yet. Create the first one!</p></div>`;
      return;
    }
    groups.forEach(g => list.appendChild(buildGroupCard(g)));
  } catch { list.innerHTML = '<p style="color:var(--c-text-2);padding:20px">Failed to load groups.</p>'; }
}

function buildGroupCard(g) {
  const card = document.createElement('div');
  card.className = 'group-card';
  card.innerHTML = `
    <div class="group-card-header">
      <div class="group-card-name">${esc(g.name)}</div>
      <div style="display:flex;gap:6px;align-items:center">
        ${g.is_private ? `<span class="group-badge private"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Private</span>` : ''}
        <span class="group-badge${g.is_member?' member':''}">${g.is_member ? '✓ Joined' : 'Open'}</span>
      </div>
    </div>
    ${g.description ? `<div class="group-card-desc">${esc(g.description)}</div>` : ''}
    <div class="group-card-meta">
      <span class="group-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>${g.member_count} member${g.member_count===1?'':'s'}</span>
      ${g.meeting_point ? `<span class="group-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${esc(g.meeting_point)}</span>` : ''}
      ${g.route_name ? `<span class="group-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>${esc(g.route_name)}</span>` : ''}
    </div>
  `;
  card.addEventListener('click', () => openGroupModal(g));
  return card;
}

// ── Group Modal ────────────────────────────────────────────
const groupOverlay = document.getElementById('groupOverlay');

async function openGroupModal(group) {
  currentGroupId = group.id;
  document.getElementById('groupModalTitle').textContent = group.name;
  document.getElementById('groupModalInfo').innerHTML = `
    ${group.description ? `<p>${esc(group.description)}</p>` : ''}
    ${group.meeting_point ? `<p>📍 <strong>Meet:</strong> ${esc(group.meeting_point)}</p>` : ''}
    ${group.route_name ? `<p>🗺️ <strong>Route:</strong> ${esc(group.route_name)}</p>` : ''}
  `;
  groupOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Reset destination UI state
  destMarker = null; destLines = []; pickingDest = false;
  document.getElementById('destBar').classList.add('hidden');
  document.getElementById('destActive').classList.add('hidden');
  document.getElementById('destSearch').value = '';
  document.getElementById('destResults').classList.add('hidden');
  document.getElementById('destResults').innerHTML = '';
  document.getElementById('destPickBtn').classList.remove('active');

  // Init map
  if (groupMap) { groupMap.remove(); groupMap = null; }
  memberMarkers = {};
  setTimeout(() => {
    groupMap = L.map('groupMap', { zoomControl: false }).setView([38, -97], 4);
    groupTileLayer = osmTile(groupMap);
    applyMapTheme(groupMap, isDarkTheme());

    // Map click → place destination when in pick mode
    groupMap.on('click', async (e) => {
      if (!pickingDest) return;
      const { lat, lng } = e.latlng;
      setPickingMode(false);
      const label = await reverseGeocode(lat, lng);
      await saveDestination(lat, lng, label);
    });

    loadGroupDetail(group.id);
  }, 100);
}

async function loadGroupDetail(groupId) {
  try {
    const res = await fetch(`${API}/api/groups/${groupId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const { group } = await res.json();
    renderMembers(group.members || []);
    renderGroupActions(group);
    // Load destination for everyone
    await refreshDestination(groupId);
  } catch {}
}

function renderMembers(members) {
  const box = document.getElementById('groupModalMembers');
  box.innerHTML = `<h4>Members (${members.length})</h4><div class="member-list">${
    members.map(m => `<div class="member-chip"><div class="member-dot"></div>${esc(m.name||'Driver')}</div>`).join('')
  }</div>`;
}

function renderGroupActions(group) {
  const box = document.getElementById('groupModalActions');
  box.innerHTML = '';

  if (!currentUser) {
    const b = document.createElement('button');
    b.className = 'btn btn-primary'; b.textContent = 'Sign In to Join';
    b.addEventListener('click', openAuth);
    box.appendChild(b);
    return;
  }

  if (!group.is_member) {
    const joinBtn = document.createElement('button');
    joinBtn.className = 'btn btn-primary'; joinBtn.textContent = 'Join Group';
    joinBtn.addEventListener('click', async () => {
      const res = await fetch(`${API}/api/groups/${group.id}/join`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) { joinBtn.textContent = 'Joined!'; joinBtn.disabled = true; startGPS(group.id); await loadGroupDetail(group.id); }
    });
    box.appendChild(joinBtn);
  } else {
    // Show destination bar for members
    document.getElementById('destBar').classList.remove('hidden');
    initDestControls(group.id);

    // GPS toggle
    const gpsWrap = document.createElement('div');
    gpsWrap.innerHTML = `<div class="gps-status"><div class="gps-dot" id="gpsDot"></div><span id="gpsLabel">GPS off</span></div>`;
    const gpsBtn = document.createElement('button');
    gpsBtn.className = 'btn btn-outline'; gpsBtn.textContent = '📡 Share My Location';
    gpsBtn.addEventListener('click', () => {
      if (gpsInterval) { stopGPS(); gpsBtn.textContent = '📡 Share My Location'; }
      else { startGPS(group.id); gpsBtn.textContent = '⏹ Stop Sharing'; }
    });
    const leaveBtn = document.createElement('button');
    leaveBtn.className = 'btn btn-outline'; leaveBtn.textContent = 'Leave Group';
    leaveBtn.style.color = '#e74c3c';
    leaveBtn.addEventListener('click', async () => {
      if (!confirm('Leave this group?')) return;
      stopGPS();
      await fetch(`${API}/api/groups/${group.id}/leave`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      closeGroupModal(); await loadGroups();
    });
    // Full-screen run button
    const runBtn = document.createElement('button');
    runBtn.className = 'btn btn-primary';
    runBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14" style="margin-right:4px"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>Start Run`;
    runBtn.addEventListener('click', () => openRunView(group));
    box.appendChild(runBtn);
    box.appendChild(gpsWrap);
    box.appendChild(gpsBtn);
    box.appendChild(leaveBtn);

    if (group.is_creator) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-outline';
      deleteBtn.textContent = '🗑 Delete Group';
      deleteBtn.style.cssText = 'color:#e74c3c;margin-top:4px;width:100%';
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('Permanently delete this group and remove all members?')) return;
        stopGPS();
        const r = await fetch(`${API}/api/groups/${group.id}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
        });
        if (r.ok) { closeGroupModal(); await loadGroups(); }
        else { const d = await r.json(); alert(d.error || 'Failed to delete.'); }
      });
      box.appendChild(deleteBtn);
    }
    startLocationPoll(group.id);
  }
}

function startGPS(groupId) {
  if (!navigator.geolocation) { alert('Geolocation not supported by your browser.'); return; }
  const dot = document.getElementById('gpsDot');
  const label = document.getElementById('gpsLabel');
  const sendLocation = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng, heading, speed } = pos.coords;
      fetch(`${API}/api/groups/${groupId}/location`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, heading: heading || 0 }),
      });
      if (dot) dot.classList.add('active');
      const mph = speed !== null ? ` · ${Math.round(speed * 2.237)} mph` : '';
      if (label) label.textContent = `Sharing${mph}`;
    }, () => {
      if (label) label.textContent = 'GPS unavailable';
    });
  };
  sendLocation();
  gpsInterval = setInterval(sendLocation, 5000);
}

function stopGPS() {
  if (gpsInterval) { clearInterval(gpsInterval); gpsInterval = null; }
  const dot = document.getElementById('gpsDot');
  const label = document.getElementById('gpsLabel');
  if (dot) dot.classList.remove('active');
  if (label) label.textContent = 'GPS off';
}

function startLocationPoll(groupId) {
  if (locationPoll) clearInterval(locationPoll);
  const poll = async () => {
    if (!token) return;
    try {
      const [locRes] = await Promise.all([
        fetch(`${API}/api/groups/${groupId}/locations`, { headers: { Authorization: `Bearer ${token}` } }),
        refreshDestination(groupId),
      ]);
      if (!locRes.ok) return;
      const { locations } = await locRes.json();
      updateMapMarkers(locations);
    } catch {}
  };
  poll();
  locationPoll = setInterval(poll, 5000);
}

function updateMapMarkers(locations) {
  if (!groupMap) return;
  const activeIds = new Set(locations.map(l => l.user_id));

  // Remove stale markers
  for (const uid of Object.keys(memberMarkers)) {
    if (!activeIds.has(parseInt(uid))) { memberMarkers[uid].remove(); delete memberMarkers[uid]; }
  }

  locations.forEach(loc => {
    const uid = loc.user_id;
    const initials = (loc.user_name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
    const isMe = currentUser && uid === currentUser.id;
    const icon = memberDivIcon(initials, isMe, loc.heading);

    if (memberMarkers[uid]) {
      memberMarkers[uid].setLatLng([loc.lat, loc.lng]);
      memberMarkers[uid].setIcon(icon);
    } else {
      memberMarkers[uid] = L.marker([loc.lat, loc.lng], { icon })
        .addTo(groupMap)
        .bindPopup(`<strong>${esc(loc.user_name||'Driver')}</strong>${isMe?' (You)':''}`, { closeButton: false });
    }

    // Update member dot colour
    const chips = document.querySelectorAll('.member-chip');
    chips.forEach(chip => { if (chip.textContent.includes(loc.user_name||'')) { chip.querySelector('.member-dot')?.classList.add('active'); } });
  });

  // Redraw dashed lines to destination
  destLines.forEach(l => l.remove()); destLines = [];
  if (destMarker) {
    const dLatLng = destMarker.getLatLng();
    Object.values(memberMarkers).forEach(m => {
      const ll = m.getLatLng();
      const line = L.polyline([[ll.lat, ll.lng], [dLatLng.lat, dLatLng.lng]], {
        color: '#E4A530', weight: 2, dashArray: '6 6', opacity: 0.7,
      }).addTo(groupMap);
      destLines.push(line);
    });
  }

  if (!destMarker && locations.length > 0) {
    const bounds = L.latLngBounds(locations.map(l => [l.lat, l.lng]));
    groupMap.fitBounds(bounds, { padding: [40, 40] });
  }
}

// ── Destination ────────────────────────────────────────────
function flagIcon() {
  return L.divIcon({
    className: '',
    html: `<div class="dest-flag-marker"><svg viewBox="0 0 24 24" width="20" height="20" fill="#E4A530"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="3" stroke="#E4A530" stroke-width="2.5"/></svg></div>`,
    iconSize: [32, 32], iconAnchor: [4, 30],
  });
}

async function refreshDestination(groupId) {
  try {
    const res = await fetch(`${API}/api/groups/${groupId}/destination`);
    if (!res.ok) return;
    const { destination } = await res.json();
    renderDestinationMarker(destination);
  } catch {}
}

function renderDestinationMarker(dest) {
  if (!groupMap) return;

  // Remove old marker and lines
  if (destMarker) { destMarker.remove(); destMarker = null; }
  destLines.forEach(l => l.remove()); destLines = [];

  const activeEl = document.getElementById('destActive');
  const labelEl = document.getElementById('destActiveLabel');

  if (!dest) {
    activeEl.classList.add('hidden');
    return;
  }

  destMarker = L.marker([dest.lat, dest.lng], { icon: flagIcon() })
    .addTo(groupMap)
    .bindPopup(`<strong>📍 Destination</strong><br>${esc(dest.label)}`, { closeButton: false });

  // Dashed lines from each member location to destination
  Object.values(memberMarkers).forEach(m => {
    const ll = m.getLatLng();
    const line = L.polyline([[ll.lat, ll.lng], [dest.lat, dest.lng]], {
      color: '#E4A530', weight: 2, dashArray: '6 6', opacity: 0.7,
    }).addTo(groupMap);
    destLines.push(line);
  });

  activeEl.classList.remove('hidden');
  labelEl.textContent = dest.label;

  // Fit map to include destination and members
  const pts = [[dest.lat, dest.lng], ...Object.values(memberMarkers).map(m => [m.getLatLng().lat, m.getLatLng().lng])];
  if (pts.length > 1) groupMap.fitBounds(L.latLngBounds(pts), { padding: [40, 40] });
  else groupMap.setView([dest.lat, dest.lng], 12);
}

async function saveDestination(lat, lng, label) {
  if (!token || !currentGroupId) return;
  try {
    const res = await fetch(`${API}/api/groups/${currentGroupId}/destination`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, label }),
    });
    if (res.ok) {
      const { destination } = await res.json();
      renderDestinationMarker(destination);
    }
  } catch {}
}

function setPickingMode(on) {
  pickingDest = on;
  const btn = document.getElementById('destPickBtn');
  const mapEl = document.getElementById('groupMap');
  btn.classList.toggle('active', on);
  mapEl.classList.toggle('dest-pick-cursor', on);
}

function initDestControls(groupId) {
  // Search
  const searchInput = document.getElementById('destSearch');
  const resultsEl = document.getElementById('destResults');

  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = searchInput.value.trim();
    if (q.length < 2) { resultsEl.classList.add('hidden'); resultsEl.innerHTML = ''; return; }
    searchTimeout = setTimeout(async () => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`);
        const results = await r.json();
        resultsEl.innerHTML = '';
        if (!results.length) { resultsEl.innerHTML = '<div class="dest-result-item" style="color:var(--c-text-2)">No results</div>'; }
        results.forEach(item => {
          const el = document.createElement('div');
          el.className = 'dest-result-item';
          el.textContent = item.display_name.split(',').slice(0, 3).join(',');
          el.addEventListener('click', async () => {
            resultsEl.classList.add('hidden');
            searchInput.value = '';
            const lat = parseFloat(item.lat), lng = parseFloat(item.lon);
            const label = item.display_name.split(',').slice(0, 2).join(',').trim();
            await saveDestination(lat, lng, label);
          });
          resultsEl.appendChild(el);
        });
        resultsEl.classList.remove('hidden');
      } catch {}
    }, 350);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#destBar')) { resultsEl.classList.add('hidden'); }
  });

  // Click-on-map pin button
  document.getElementById('destPickBtn').addEventListener('click', () => {
    setPickingMode(!pickingDest);
  });

  // Clear destination
  document.getElementById('destClearBtn').addEventListener('click', async () => {
    if (!token || !currentGroupId) return;
    await fetch(`${API}/api/groups/${currentGroupId}/destination`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    renderDestinationMarker(null);
  });
}

async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const d = await r.json();
    return d.display_name?.split(',').slice(0, 2).join(',').trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch { return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; }
}

// ── Full-screen Run Mode ───────────────────────────────────
function openRunView(group) {
  runGroupId = group.id;
  const view = document.getElementById('groupRunView');
  document.getElementById('runGroupName').textContent = group.name;
  view.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Init run map
  if (runMap) { runMap.remove(); runMap = null; }
  runMemberMarkers = {}; runDestMarker = null; runDestLines = [];
  setTimeout(() => {
    runMap = L.map('runMap', { zoomControl: false }).setView([38, -97], 4);
    runTileLayer = osmTile(runMap);
    applyMapTheme(runMap, isDarkTheme());

    // Locate me control
    const LocCtrl = L.Control.extend({
      onAdd(m) {
        const btn = L.DomUtil.create('button', 'map-locate-btn leaflet-bar');
        btn.title = 'Center on me';
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="18" height="18"><circle cx="12" cy="12" r="3"/><line x1="12" y1="1" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="1" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="23" y2="12"/></svg>`;
        L.DomEvent.on(btn, 'click', ev => {
          L.DomEvent.stopPropagation(ev);
          if (!navigator.geolocation) return;
          navigator.geolocation.getCurrentPosition(p => m.setView([p.coords.latitude, p.coords.longitude], 14));
        });
        return btn;
      }
    });
    new LocCtrl({ position: 'topright' }).addTo(runMap);

    startRunGPS(group.id);
    startRunPoll(group.id);
  }, 80);
}

function closeRunView() {
  document.getElementById('groupRunView').style.display = 'none';
  document.body.style.overflow = '';
  stopRunGPS();
  if (runPollInterval) { clearInterval(runPollInterval); runPollInterval = null; }
  if (runMap) { runMap.remove(); runMap = null; runTileLayer = null; }
  runMemberMarkers = {}; runDestMarker = null; runDestLines = [];
}

function startRunGPS(groupId) {
  if (!navigator.geolocation) return;
  const dot = document.getElementById('runGpsDot');
  const label = document.getElementById('runGpsLabel');
  const speedEl = document.getElementById('runSpeed');
  const send = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng, heading, speed } = pos.coords;
      fetch(`${API}/api/groups/${groupId}/location`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, heading: heading || 0 }),
      });
      if (dot) dot.classList.add('active');
      if (label) label.textContent = 'Live';
      if (speedEl) {
        const mph = speed !== null ? Math.round(speed * 2.237) : null;
        speedEl.textContent = mph !== null ? `${mph} mph` : '-- mph';
        speedEl.style.display = '';
      }
    }, () => { if (label) label.textContent = 'GPS unavailable'; });
  };
  send();
  runGpsInterval = setInterval(send, 4000);
}

function stopRunGPS() {
  if (runGpsInterval) { clearInterval(runGpsInterval); runGpsInterval = null; }
}

function startRunPoll(groupId) {
  if (runPollInterval) clearInterval(runPollInterval);
  const poll = async () => {
    if (!token || !runMap) return;
    try {
      const [locRes, destRes] = await Promise.all([
        fetch(`${API}/api/groups/${groupId}/locations`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/groups/${groupId}/destination`),
      ]);
      if (locRes.ok) { const { locations } = await locRes.json(); updateRunMarkers(locations); }
      if (destRes.ok) {
        const { destination } = await destRes.json();
        updateRunDestination(destination);
        const destLabel = document.getElementById('runDest');
        if (destLabel) { destLabel.textContent = destination ? `📍 ${destination.label}` : ''; destLabel.style.display = destination ? '' : 'none'; }
      }
    } catch {}
  };
  poll();
  runPollInterval = setInterval(poll, 4000);
}

function updateRunMarkers(locations) {
  if (!runMap) return;
  const activeIds = new Set(locations.map(l => l.user_id));
  for (const uid of Object.keys(runMemberMarkers)) {
    if (!activeIds.has(parseInt(uid))) { runMemberMarkers[uid].remove(); delete runMemberMarkers[uid]; }
  }
  const memberEl = document.getElementById('runMembers');
  if (memberEl) memberEl.innerHTML = locations.map(loc => {
    const isMe = currentUser && loc.user_id === currentUser.id;
    return `<div class="run-member-chip${isMe?' me':''}"><div class="member-dot active"></div>${esc(loc.user_name||'Driver')}${isMe?' (You)':''}</div>`;
  }).join('');

  locations.forEach(loc => {
    const uid = loc.user_id;
    const initials = (loc.user_name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
    const isMe = currentUser && uid === currentUser.id;
    const icon = memberDivIcon(initials, isMe, loc.heading);
    if (runMemberMarkers[uid]) {
      runMemberMarkers[uid].setLatLng([loc.lat, loc.lng]);
      runMemberMarkers[uid].setIcon(icon);
    } else {
      runMemberMarkers[uid] = L.marker([loc.lat, loc.lng], { icon })
        .addTo(runMap)
        .bindPopup(`<strong>${esc(loc.user_name||'Driver')}</strong>`, { closeButton: false });
    }
  });

  // Fit to all members if we don't have a destination anchoring the view
  if (!runDestMarker && locations.length > 0) {
    const bounds = L.latLngBounds(locations.map(l => [l.lat, l.lng]));
    runMap.fitBounds(bounds, { padding: [60, 60] });
  }
}

function updateRunDestination(dest) {
  if (!runMap) return;
  if (runDestMarker) { runDestMarker.remove(); runDestMarker = null; }
  runDestLines.forEach(l => l.remove()); runDestLines = [];
  if (!dest) return;
  runDestMarker = L.marker([dest.lat, dest.lng], { icon: flagIcon() })
    .addTo(runMap)
    .bindPopup(`<strong>📍 Destination</strong><br>${esc(dest.label)}`, { closeButton: false });
  Object.values(runMemberMarkers).forEach(m => {
    const ll = m.getLatLng();
    runDestLines.push(L.polyline([[ll.lat, ll.lng], [dest.lat, dest.lng]], { color: '#E4A530', weight: 2, dashArray: '6 6', opacity: 0.7 }).addTo(runMap));
  });
  const pts = [[dest.lat, dest.lng], ...Object.values(runMemberMarkers).map(m => [m.getLatLng().lat, m.getLatLng().lng])];
  if (pts.length > 1) runMap.fitBounds(L.latLngBounds(pts), { padding: [60, 60] });
}

document.getElementById('runExitBtn')?.addEventListener('click', closeRunView);

function closeGroupModal() {
  groupOverlay.classList.remove('open');
  document.body.style.overflow = '';
  stopGPS();
  if (locationPoll) { clearInterval(locationPoll); locationPoll = null; }
  if (groupMap) { groupMap.remove(); groupMap = null; groupTileLayer = null; }
  memberMarkers = {};
  destMarker = null; destLines = []; pickingDest = false;
}

document.getElementById('groupModalClose')?.addEventListener('click', closeGroupModal);
groupOverlay.addEventListener('click', e => { if (e.target === groupOverlay) closeGroupModal(); });

// ── Create Group ───────────────────────────────────────────
const createGroupOverlay = document.getElementById('createGroupOverlay');
let groupIsPrivate = false;

document.getElementById('createGroupBtn')?.addEventListener('click', () => {
  if (!currentUser) return openAuth();
  createGroupOverlay.classList.add('open');
});
document.getElementById('createGroupClose')?.addEventListener('click', () => createGroupOverlay.classList.remove('open'));
createGroupOverlay.addEventListener('click', e => { if (e.target === createGroupOverlay) createGroupOverlay.classList.remove('open'); });

// Visibility toggle
document.getElementById('visibilityToggle')?.addEventListener('click', e => {
  const btn = e.target.closest('.vis-btn');
  if (!btn) return;
  groupIsPrivate = btn.dataset.val === 'true';
  document.querySelectorAll('.vis-btn').forEach(b => b.classList.toggle('active', b === btn));
  document.getElementById('visHint').textContent = groupIsPrivate
    ? 'Only members you invite can see this group.'
    : 'Anyone can see and join this group.';
});

document.getElementById('submitGroupBtn')?.addEventListener('click', async () => {
  const name = document.getElementById('groupName').value.trim();
  const err = document.getElementById('createGroupError');
  if (!name) { err.textContent = 'Group name is required.'; return; }
  if (!token) { err.textContent = 'You must be signed in to create a group.'; return; }
  err.textContent = '';
  const btn = document.getElementById('submitGroupBtn');
  btn.disabled = true; btn.textContent = 'Creating…';
  try {
    const res = await fetch(`${API}/api/groups`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: document.getElementById('groupDesc').value.trim(),
        meeting_point: document.getElementById('groupMeeting').value.trim(),
        route_name: document.getElementById('groupRoute').value.trim(),
        is_private: groupIsPrivate,
      }),
    });
    const data = await res.json();
    if (!res.ok) { err.textContent = data.error || 'Failed to create group.'; return; }
    createGroupOverlay.classList.remove('open');
    ['groupName','groupDesc','groupMeeting','groupRoute'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    groupIsPrivate = false;
    document.getElementById('visBtnPublic')?.classList.add('active');
    document.getElementById('visBtnPrivate')?.classList.remove('active');
    const hint = document.getElementById('visHint'); if (hint) hint.textContent = 'Anyone can see and join this group.';
    await loadGroups();
  } catch (e) { console.error('createGroup client error:', e); err.textContent = 'Network error — check your connection.'; }
  finally { btn.disabled = false; btn.textContent = 'Create Group'; }
});

// ── Auth Modal ─────────────────────────────────────────────
const authOverlay = document.getElementById('authOverlay');
let authMode = 'login';
function openAuth() { authOverlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
document.getElementById('authClose')?.addEventListener('click', () => { authOverlay.classList.remove('open'); document.body.style.overflow = ''; });
authOverlay.addEventListener('click', e => { if (e.target === authOverlay) { authOverlay.classList.remove('open'); document.body.style.overflow = ''; } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { authOverlay.classList.remove('open'); createGroupOverlay.classList.remove('open'); document.body.style.overflow = ''; } });

document.getElementById('authSwitchBtn')?.addEventListener('click', () => {
  authMode = authMode === 'login' ? 'register' : 'login';
  document.getElementById('loginForm').style.display  = authMode === 'login' ? '' : 'none';
  document.getElementById('registerForm').style.display = authMode === 'register' ? '' : 'none';
  document.getElementById('authTitle').textContent = authMode === 'login' ? 'Sign In' : 'Create Account';
  document.getElementById('authSwitchText').textContent = authMode === 'login' ? 'Don\'t have an account?' : 'Already have one?';
  document.getElementById('authSwitchBtn').textContent = authMode === 'login' ? 'Sign Up' : 'Sign In';
});

document.getElementById('loginForm')?.addEventListener('submit', async e => {
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
    renderNav(currentUser); await loadGroups();
  } catch { document.getElementById('loginError').textContent = 'Network error.'; }
});

document.getElementById('registerForm')?.addEventListener('submit', async e => {
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
    renderNav(currentUser); await loadGroups();
  } catch { document.getElementById('regError').textContent = 'Network error.'; }
});

// ── Utils ──────────────────────────────────────────────────
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── Init ───────────────────────────────────────────────────
(async () => { await loadMe(); await loadGroups(); })();
