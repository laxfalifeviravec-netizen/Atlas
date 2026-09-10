/* ============================================================
   Atlas — Profile Page JS
   ============================================================ */

const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001' : '';

let token = localStorage.getItem('atlas-token');
let currentUser = null;
let profileUser = null;
let editAvatarFile = null;

// ── Theme ──────────────────────────────────────────────────
const savedTheme = localStorage.getItem('atlas-theme');
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
document.getElementById('themeToggle').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('atlas-theme', next);
});

// ── Back button ────────────────────────────────────────────
document.getElementById('backBtn').addEventListener('click', () => {
  if (document.referrer && new URL(document.referrer).hostname === location.hostname) {
    history.back();
  } else {
    location.href = 'community.html';
  }
});

// ── Auth ───────────────────────────────────────────────────
async function loadMe() {
  if (!token) return;
  try {
    const res = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { token = null; localStorage.removeItem('atlas-token'); return; }
    const { user } = await res.json();
    currentUser = user;
  } catch {}
}

// ── Load profile ───────────────────────────────────────────
function getTargetId() {
  const params = new URLSearchParams(location.search);
  return parseInt(params.get('id')) || null;
}

async function loadProfile() {
  const targetId = getTargetId();
  if (!targetId) { location.href = 'community.html'; return; }

  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${API}/api/users/${targetId}`, { headers });
    if (!res.ok) { showError(); return; }
    const { user } = await res.json();
    profileUser = user;
    renderProfile(user);
    loadGrid(targetId);
  } catch { showError(); }
}

function showError() {
  document.getElementById('profileLoading').innerHTML =
    '<p style="padding:32px;color:var(--c-text-2);text-align:center">Profile not found.</p>';
}

function renderProfile(user) {
  document.getElementById('profileLoading').style.display = 'none';
  document.getElementById('profileContent').style.display = '';
  document.getElementById('headerName').textContent = user.name;
  document.title = `${user.name} — Atlas`;

  // Avatar
  const avatarEl = document.getElementById('profileAvatar');
  if (user.avatar) {
    avatarEl.innerHTML = `<img src="${user.avatar}" alt="${esc(user.name)}" />`;
  } else {
    const init = user.name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
    avatarEl.textContent = init;
  }

  document.getElementById('profileName').textContent = user.name;
  document.getElementById('profilePlan').textContent = user.plan || 'Explorer';
  document.getElementById('profileBio').textContent = user.bio || '';
  if (!user.bio) document.getElementById('profileBio').style.display = 'none';

  document.getElementById('statPostCount').textContent = fmtNum(user.post_count);
  document.getElementById('statFollowerCount').textContent = fmtNum(user.follower_count);
  document.getElementById('statFollowingCount').textContent = fmtNum(user.following_count);

  renderActions(user);
}

function renderActions(user) {
  const el = document.getElementById('profileActions');
  const isOwn = currentUser && currentUser.id === user.id;

  if (isOwn) {
    el.innerHTML = `<button class="btn btn-outline" id="editProfileBtn">Edit Profile</button>`;
    document.getElementById('editProfileBtn').addEventListener('click', openEditModal);
  } else {
    const isFollowing = user.is_following;
    el.innerHTML = `
      <button class="btn ${isFollowing ? 'btn-unfollow' : 'btn-follow'}" id="followBtn">
        ${isFollowing ? 'Following' : 'Follow'}
      </button>`;
    document.getElementById('followBtn').addEventListener('click', toggleFollow);
  }
}

async function toggleFollow() {
  if (!currentUser) return openAuth();
  const btn = document.getElementById('followBtn');
  const isFollowing = profileUser.is_following;
  btn.disabled = true;

  try {
    const method = isFollowing ? 'DELETE' : 'POST';
    const res = await fetch(`${API}/api/follow/${profileUser.id}`, {
      method, headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    profileUser.is_following = data.following;
    profileUser.follower_count += data.following ? 1 : -1;
    document.getElementById('statFollowerCount').textContent = fmtNum(profileUser.follower_count);
    renderActions(profileUser);
  } catch {} finally { btn.disabled = false; }
}

// ── Post grid ──────────────────────────────────────────────
async function loadGrid(userId) {
  const grid = document.getElementById('profileGrid');
  const emptyEl = document.getElementById('profileEmpty');
  try {
    const res = await fetch(`${API}/api/users/${userId}/posts`);
    const { posts } = await res.json();
    grid.innerHTML = '';
    if (!posts || posts.length === 0) { emptyEl.style.display = 'flex'; return; }
    emptyEl.style.display = 'none';
    posts.forEach(p => {
      const tile = document.createElement('div');
      tile.className = 'profile-grid-tile';
      tile.innerHTML = `
        <img src="${p.image_url}" alt="" loading="lazy" />
        <div class="profile-grid-tile-overlay">
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="16" height="16"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          ${p.likes || 0}
        </div>`;
      tile.addEventListener('click', () => openPost(p));
      grid.appendChild(tile);
    });
  } catch {}
}

function openPost(p) {
  // Navigate to community feed with the post highlighted
  location.href = `community.html?post=${p.id}`;
}

// ── Edit profile modal ─────────────────────────────────────
const editOverlay = document.getElementById('editOverlay');

function openEditModal() {
  if (!currentUser) return;
  document.getElementById('editName').value = currentUser.name || '';
  document.getElementById('editBio').value = currentUser.bio || '';

  const prev = document.getElementById('editAvatarPreview');
  if (currentUser.avatar) {
    prev.innerHTML = `<img src="${currentUser.avatar}" alt="" />`;
  } else {
    const init = currentUser.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
    prev.textContent = init;
  }

  editOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

document.getElementById('editClose').addEventListener('click', () => {
  editOverlay.classList.remove('open'); document.body.style.overflow = '';
});
editOverlay.addEventListener('click', e => {
  if (e.target === editOverlay) { editOverlay.classList.remove('open'); document.body.style.overflow = ''; }
});

document.getElementById('editAvatarZone').addEventListener('click', () => {
  document.getElementById('editAvatarInput').click();
});
document.getElementById('editAvatarInput').addEventListener('change', e => {
  editAvatarFile = e.target.files[0];
  if (editAvatarFile) {
    const prev = document.getElementById('editAvatarPreview');
    prev.innerHTML = `<img src="${URL.createObjectURL(editAvatarFile)}" alt="" />`;
  }
});

document.getElementById('saveProfileBtn').addEventListener('click', async () => {
  const name = document.getElementById('editName').value.trim();
  const bio  = document.getElementById('editBio').value;
  const err  = document.getElementById('editError');
  if (!name) { err.textContent = 'Name is required.'; return; }
  err.textContent = '';

  const fd = new FormData();
  fd.append('name', name);
  fd.append('bio', bio);
  if (editAvatarFile) fd.append('avatar', editAvatarFile);

  const btn = document.getElementById('saveProfileBtn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const res = await fetch(`${API}/api/auth/me`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) { err.textContent = data.error; return; }
    currentUser = data.user;
    profileUser = { ...profileUser, ...data.user };
    renderProfile(profileUser);
    editOverlay.classList.remove('open'); document.body.style.overflow = '';
    editAvatarFile = null;
  } catch { err.textContent = 'Failed to save.'; }
  finally { btn.disabled = false; btn.textContent = 'Save Changes'; }
});

// ── Auth modal ─────────────────────────────────────────────
const authOverlay = document.getElementById('authOverlay');
let authMode = 'login';
function openAuth() { authOverlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
document.getElementById('authClose').addEventListener('click', () => { authOverlay.classList.remove('open'); document.body.style.overflow = ''; });
authOverlay.addEventListener('click', e => { if (e.target === authOverlay) { authOverlay.classList.remove('open'); document.body.style.overflow = ''; } });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { [authOverlay, editOverlay].forEach(o => o.classList.remove('open')); document.body.style.overflow = ''; }
});

document.getElementById('authSwitchBtn').addEventListener('click', () => {
  authMode = authMode === 'login' ? 'register' : 'login';
  document.getElementById('loginForm').style.display  = authMode === 'login' ? '' : 'none';
  document.getElementById('registerForm').style.display = authMode === 'register' ? '' : 'none';
  document.getElementById('authTitle').textContent = authMode === 'login' ? 'Sign In' : 'Create Account';
  document.getElementById('authSwitchText').textContent = authMode === 'login' ? "Don't have an account?" : 'Already have one?';
  document.getElementById('authSwitchBtn').textContent = authMode === 'login' ? 'Sign Up' : 'Sign In';
});

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  try {
    const res = await fetch(`${API}/api/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password}) });
    const data = await res.json();
    if (!res.ok) { document.getElementById('loginError').textContent = data.error; return; }
    token = data.token; currentUser = data.user;
    localStorage.setItem('atlas-token', token);
    authOverlay.classList.remove('open'); document.body.style.overflow = '';
    renderActions(profileUser);
  } catch { document.getElementById('loginError').textContent = 'Network error.'; }
});

document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  try {
    const res = await fetch(`${API}/api/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name,email,password}) });
    const data = await res.json();
    if (!res.ok) { document.getElementById('regError').textContent = data.error; return; }
    token = data.token; currentUser = data.user;
    localStorage.setItem('atlas-token', token);
    authOverlay.classList.remove('open'); document.body.style.overflow = '';
    renderActions(profileUser);
  } catch { document.getElementById('regError').textContent = 'Network error.'; }
});

function fmtNum(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1).replace(/\.0$/,'') + 'M';
  if (n >= 1000)    return (n/1000).toFixed(1).replace(/\.0$/,'') + 'K';
  return String(n || 0);
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

(async () => {
  await loadMe();
  await loadProfile();
})();
