/* ============================================================
   Atlas — Groups JS (live GPS driving groups)
   ============================================================ */

const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001' : '';

let token = localStorage.getItem('atlas-token');
let currentUser = null;
let groupMap = null;
let memberMarkers = {};
let gpsInterval = null;
let currentGroupId = null;
let locationPoll = null;

// ── Theme ──────────────────────────────────────────────────
const savedTheme = localStorage.getItem('atlas-theme');
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
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
      <span class="group-badge${g.is_member?' member':''}">${g.is_member ? '✓ Joined' : 'Open'}</span>
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

  // Init map
  if (groupMap) { groupMap.remove(); groupMap = null; }
  memberMarkers = {};
  setTimeout(() => {
    groupMap = L.map('groupMap', { zoomControl: true }).setView([38, -97], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 19
    }).addTo(groupMap);
    loadGroupDetail(group.id);
  }, 100);
}

async function loadGroupDetail(groupId) {
  try {
    const res = await fetch(`${API}/api/groups/${groupId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const { group } = await res.json();
    renderMembers(group.members || []);
    renderGroupActions(group);
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
    // GPS toggle
    const gpsWrap = document.createElement('div');
    gpsWrap.innerHTML = `<div class="gps-status"><div class="gps-dot" id="gpsDot"></div><span id="gpsLabel">GPS off</span></div>`;
    const gpsBtn = document.createElement('button');
    gpsBtn.className = 'btn btn-outline'; gpsBtn.textContent = '📡 Share My Location';
    gpsBtn.addEventListener('click', () => {
      if (gpsInterval) {
        stopGPS();
        gpsBtn.textContent = '📡 Share My Location';
      } else {
        startGPS(group.id);
        gpsBtn.textContent = '⏹ Stop Sharing';
      }
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
    box.appendChild(gpsWrap);
    box.appendChild(gpsBtn);
    box.appendChild(leaveBtn);
    // Start polling member locations
    startLocationPoll(group.id);
  }
}

function startGPS(groupId) {
  if (!navigator.geolocation) { alert('Geolocation not supported by your browser.'); return; }
  const dot = document.getElementById('gpsDot');
  const label = document.getElementById('gpsLabel');
  const sendLocation = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng, heading } = pos.coords;
      fetch(`${API}/api/groups/${groupId}/location`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, heading: heading || 0 }),
      });
      if (dot) dot.classList.add('active');
      if (label) label.textContent = `Sharing (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
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
      const res = await fetch(`${API}/api/groups/${groupId}/locations`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const { locations } = await res.json();
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

    if (memberMarkers[uid]) {
      memberMarkers[uid].setLatLng([loc.lat, loc.lng]);
    } else {
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${isMe?'#dc2222':'#1a73e8'};color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:Barlow Condensed,sans-serif;font-weight:700;font-size:13px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${initials}</div>`,
        iconSize: [32,32], iconAnchor: [16,16],
      });
      memberMarkers[uid] = L.marker([loc.lat, loc.lng], { icon })
        .addTo(groupMap)
        .bindPopup(`<strong>${esc(loc.user_name||'Driver')}</strong>${isMe?' (You)':''}`, { closeButton: false });
    }

    // Update member dot colour
    const chips = document.querySelectorAll('.member-chip');
    chips.forEach(chip => { if (chip.textContent.includes(loc.user_name||'')) { chip.querySelector('.member-dot')?.classList.add('active'); } });
  });

  if (locations.length > 0) {
    const bounds = L.latLngBounds(locations.map(l => [l.lat, l.lng]));
    groupMap.fitBounds(bounds, { padding: [40, 40] });
  }
}

function closeGroupModal() {
  groupOverlay.classList.remove('open');
  document.body.style.overflow = '';
  stopGPS();
  if (locationPoll) { clearInterval(locationPoll); locationPoll = null; }
  if (groupMap) { groupMap.remove(); groupMap = null; }
  memberMarkers = {};
}

document.getElementById('groupModalClose').addEventListener('click', closeGroupModal);
groupOverlay.addEventListener('click', e => { if (e.target === groupOverlay) closeGroupModal(); });

// ── Create Group ───────────────────────────────────────────
const createGroupOverlay = document.getElementById('createGroupOverlay');

document.getElementById('createGroupBtn').addEventListener('click', () => {
  if (!currentUser) return openAuth();
  createGroupOverlay.classList.add('open');
});
document.getElementById('createGroupClose').addEventListener('click', () => createGroupOverlay.classList.remove('open'));
createGroupOverlay.addEventListener('click', e => { if (e.target === createGroupOverlay) createGroupOverlay.classList.remove('open'); });

document.getElementById('submitGroupBtn').addEventListener('click', async () => {
  const name = document.getElementById('groupName').value.trim();
  const err = document.getElementById('createGroupError');
  if (!name) { err.textContent = 'Group name is required.'; return; }
  err.textContent = '';
  try {
    const res = await fetch(`${API}/api/groups`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: document.getElementById('groupDesc').value.trim(),
        meeting_point: document.getElementById('groupMeeting').value.trim(),
        route_name: document.getElementById('groupRoute').value.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) { err.textContent = data.error; return; }
    createGroupOverlay.classList.remove('open');
    ['groupName','groupDesc','groupMeeting','groupRoute'].forEach(id => document.getElementById(id).value = '');
    await loadGroups();
  } catch { err.textContent = 'Failed to create group.'; }
});

// ── Auth Modal ─────────────────────────────────────────────
const authOverlay = document.getElementById('authOverlay');
let authMode = 'login';
function openAuth() { authOverlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
document.getElementById('authClose').addEventListener('click', () => { authOverlay.classList.remove('open'); document.body.style.overflow = ''; });
authOverlay.addEventListener('click', e => { if (e.target === authOverlay) { authOverlay.classList.remove('open'); document.body.style.overflow = ''; } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { authOverlay.classList.remove('open'); createGroupOverlay.classList.remove('open'); document.body.style.overflow = ''; } });

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
    renderNav(currentUser); await loadGroups();
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
    renderNav(currentUser); await loadGroups();
  } catch { document.getElementById('regError').textContent = 'Network error.'; }
});

// ── Utils ──────────────────────────────────────────────────
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── Init ───────────────────────────────────────────────────
(async () => { await loadMe(); await loadGroups(); })();
