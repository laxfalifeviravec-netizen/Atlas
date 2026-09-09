/* ============================================================
   Atlas — Marketplace JS
   ============================================================ */

const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001' : '';

let token = localStorage.getItem('atlas-token');
let currentUser = null;
let activeCategory = 'All';
let listingFile = null;

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

// ── Load Listings ──────────────────────────────────────────
async function loadListings(category) {
  const grid = document.getElementById('marketGrid');
  grid.innerHTML = '<div class="feed-loading"><div class="spinner"></div></div>';
  try {
    const url = category && category !== 'All' ? `${API}/api/marketplace?category=${encodeURIComponent(category)}` : `${API}/api/marketplace`;
    const res = await fetch(url);
    const { listings } = await res.json();
    grid.innerHTML = '';
    if (listings.length === 0) {
      grid.innerHTML = `<div class="market-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="56" height="56"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg><p>No listings yet.</p></div>`;
      return;
    }
    listings.forEach(l => grid.appendChild(buildListingCard(l)));
  } catch { grid.innerHTML = '<p style="padding:24px;color:var(--c-text-2)">Failed to load listings.</p>'; }
}

function catIcon(cat) {
  const icons = { Cars:'🚗', Mods:'🔧', Wheels:'🛞', Electronics:'📡', Other:'📦' };
  return icons[cat] || '📦';
}

function buildListingCard(l) {
  const card = document.createElement('div');
  card.className = 'listing-card';
  const imgUrl = l.image_url ? (l.image_url.startsWith('http') ? l.image_url : `${API}${l.image_url}`) : null;
  card.innerHTML = `
    <div class="listing-card-img">
      ${imgUrl ? `<img src="${imgUrl}" alt="${esc(l.title)}" loading="lazy" />` : `<div class="no-img">${catIcon(l.category)}</div>`}
      <span class="listing-card-cat">${esc(l.category)}</span>
    </div>
    <div class="listing-card-body">
      <div class="listing-card-title">${esc(l.title)}</div>
      <div class="listing-card-price">${esc(l.price)}</div>
      <div class="listing-card-meta">by ${esc(l.seller_name||'Seller')}</div>
    </div>`;
  card.addEventListener('click', () => openListingModal(l));
  return card;
}

// ── Listing Detail Modal ───────────────────────────────────
const listingOverlay = document.getElementById('listingOverlay');

function openListingModal(l) {
  const imgUrl = l.image_url ? (l.image_url.startsWith('http') ? l.image_url : `${API}${l.image_url}`) : null;
  const isOwner = currentUser && currentUser.id === l.user_id;

  document.getElementById('listingModalContent').innerHTML = `
    <div class="listing-detail-img">
      ${imgUrl ? `<img src="${imgUrl}" alt="${esc(l.title)}" />` : `<div class="no-img-lg">${catIcon(l.category)}</div>`}
    </div>
    <div class="listing-detail-body">
      <div class="listing-detail-title">${esc(l.title)}</div>
      <div class="listing-detail-price">${esc(l.price)}</div>
      <div class="listing-detail-seller">Listed by ${esc(l.seller_name||'Seller')} · ${esc(l.category)}</div>
      ${l.description ? `<div class="listing-detail-desc">${esc(l.description)}</div>` : ''}
      ${l.contact ? `<div class="listing-detail-contact"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.71 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${esc(l.contact)}</div>` : ''}
      ${isOwner ? `<button class="listing-delete-btn" id="deleteListingBtn">Delete listing</button>` : ''}
    </div>`;

  if (isOwner) {
    document.getElementById('deleteListingBtn').addEventListener('click', async () => {
      if (!confirm('Delete this listing?')) return;
      await fetch(`${API}/api/marketplace/${l.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      listingOverlay.classList.remove('open'); document.body.style.overflow = '';
      await loadListings(activeCategory);
    });
  }

  listingOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

document.getElementById('listingClose').addEventListener('click', () => { listingOverlay.classList.remove('open'); document.body.style.overflow = ''; });
listingOverlay.addEventListener('click', e => { if (e.target === listingOverlay) { listingOverlay.classList.remove('open'); document.body.style.overflow = ''; } });

// ── Category tabs ──────────────────────────────────────────
document.getElementById('marketCats').addEventListener('click', e => {
  const tab = e.target.closest('.cat-tab');
  if (!tab) return;
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  activeCategory = tab.dataset.cat;
  loadListings(activeCategory);
});

// ── Create Listing ─────────────────────────────────────────
const createListingOverlay = document.getElementById('createListingOverlay');
const listingUploadZone   = document.getElementById('listingUploadZone');
const listingImageInput   = document.getElementById('listingImageInput');
const listingPreview      = document.getElementById('listingPreview');

document.getElementById('createListingBtn').addEventListener('click', () => {
  if (!currentUser) return openAuth();
  createListingOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
});
document.getElementById('createListingClose').addEventListener('click', () => { createListingOverlay.classList.remove('open'); document.body.style.overflow = ''; });
createListingOverlay.addEventListener('click', e => { if (e.target === createListingOverlay) { createListingOverlay.classList.remove('open'); document.body.style.overflow = ''; } });

listingUploadZone.addEventListener('click', () => listingImageInput.click());
listingImageInput.addEventListener('change', e => {
  listingFile = e.target.files[0];
  if (listingFile) {
    listingPreview.src = URL.createObjectURL(listingFile);
    listingPreview.style.display = 'block';
    listingUploadZone.style.display = 'none';
  }
});

document.getElementById('submitListingBtn').addEventListener('click', async () => {
  const title = document.getElementById('listingTitle').value.trim();
  const price = document.getElementById('listingPrice').value.trim();
  const err = document.getElementById('createListingError');
  if (!title || !price) { err.textContent = 'Title and price are required.'; return; }
  err.textContent = '';

  const fd = new FormData();
  if (listingFile) fd.append('image', listingFile);
  fd.append('title', title);
  fd.append('price', price);
  fd.append('category', document.getElementById('listingCategory').value);
  fd.append('description', document.getElementById('listingDesc').value.trim());
  fd.append('contact', document.getElementById('listingContact').value.trim());

  const btn = document.getElementById('submitListingBtn');
  btn.disabled = true; btn.textContent = 'Posting…';
  try {
    const res = await fetch(`${API}/api/marketplace`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const data = await res.json();
    if (!res.ok) { err.textContent = data.error; return; }
    createListingOverlay.classList.remove('open'); document.body.style.overflow = '';
    listingFile = null; listingPreview.style.display = 'none'; listingUploadZone.style.display = '';
    ['listingTitle','listingPrice','listingDesc','listingContact'].forEach(id => document.getElementById(id).value = '');
    await loadListings(activeCategory);
  } catch { err.textContent = 'Failed to post listing.'; }
  finally { btn.disabled = false; btn.textContent = 'Post Listing'; }
});

// ── Auth Modal ─────────────────────────────────────────────
const authOverlay = document.getElementById('authOverlay');
let authMode = 'login';
function openAuth() { authOverlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
document.getElementById('authClose').addEventListener('click', () => { authOverlay.classList.remove('open'); document.body.style.overflow = ''; });
authOverlay.addEventListener('click', e => { if (e.target === authOverlay) { authOverlay.classList.remove('open'); document.body.style.overflow = ''; } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { [authOverlay, createListingOverlay, listingOverlay].forEach(o => o.classList.remove('open')); document.body.style.overflow = ''; } });

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
    renderNav(currentUser); await loadListings(activeCategory);
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
    renderNav(currentUser); await loadListings(activeCategory);
  } catch { document.getElementById('regError').textContent = 'Network error.'; }
});

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

(async () => { await loadMe(); await loadListings('All'); })();
