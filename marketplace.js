/* ============================================================
   One Culture — Marketplace JS
   ============================================================ */

const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001' : '';

let token = localStorage.getItem('culture-token');
let currentUser = null;
let activeCategory = 'All';
let listingFiles = [];
let allListings = [];

// ── Theme ──────────────────────────────────────────────────
const savedTheme = localStorage.getItem('culture-theme');
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
document.getElementById('themeToggle').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('culture-theme', next);
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

// ── Load Listings ──────────────────────────────────────────
async function loadListings(category) {
  const grid = document.getElementById('marketGrid');
  grid.innerHTML = '<div class="feed-loading"><div class="spinner"></div></div>';
  try {
    const url = category && category !== 'All' ? `${API}/api/marketplace?category=${encodeURIComponent(category)}` : `${API}/api/marketplace`;
    const res = await fetch(url);
    const { listings } = await res.json();
    allListings = listings;
    renderGrid(listings);
  } catch { grid.innerHTML = '<p style="padding:24px;color:var(--c-text-2)">Failed to load listings.</p>'; }
}

function renderGrid(listings) {
  const grid = document.getElementById('marketGrid');
  grid.innerHTML = '';
  if (!listings.length) {
    grid.innerHTML = `<div class="market-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="56" height="56"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg><p>No listings yet.</p><small>Be the first to list something</small></div>`;
    return;
  }
  listings.forEach(l => grid.appendChild(buildListingCard(l)));
}

function filterAndRender() {
  const q = (document.getElementById('marketSearch')?.value || '').toLowerCase().trim();
  let results = activeCategory === 'All' ? allListings : allListings.filter(l => l.category === activeCategory);
  if (q) results = results.filter(l => (l.title + ' ' + l.category + ' ' + (l.description || '')).toLowerCase().includes(q));
  renderGrid(results);
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
    </div>
    <div class="listing-card-body">
      <div class="listing-card-price">${esc(l.price)}</div>
      <div class="listing-card-title">${esc(l.title)}</div>
      <div class="listing-card-location">${esc(l.seller_name||'Seller')}</div>
    </div>`;
  card.addEventListener('click', () => openListingModal(l));
  return card;
}

// ── Listing Detail Modal ───────────────────────────────────
const listingOverlay = document.getElementById('listingOverlay');

function buildListingCarousel(l) {
  const urls = (l.image_urls?.length ? l.image_urls : (l.image_url ? [l.image_url] : [])).map(u => u.startsWith('http') ? u : `${API}${u}`);
  if (!urls.length) return `<div class="no-img-lg">${catIcon(l.category)}</div>`;
  if (urls.length === 1) return `<img src="${urls[0]}" alt="${esc(l.title)}" />`;
  const slides = urls.map(u => `<div class="carousel-slide"><img src="${u}" alt="${esc(l.title)}" /></div>`).join('');
  const dots = urls.map((_, i) => `<div class="carousel-dot${i===0?' active':''}"></div>`).join('');
  return `<div class="carousel-track" data-count="${urls.length}">${slides}</div>
          <div class="carousel-dots">${dots}</div>
          <div class="carousel-count">1 / ${urls.length}</div>`;
}

function openListingModal(l) {
  const isOwner = currentUser && currentUser.id === l.user_id;
  const sellerInitials = (l.seller_name || 'S').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();

  document.getElementById('listingModalContent').innerHTML = `
    <div class="listing-detail-img" id="listingDetailImg">
      ${buildListingCarousel(l)}
    </div>
    <div class="listing-detail-body">
      <div class="listing-detail-price">${esc(l.price)}</div>
      <div class="listing-detail-title">${esc(l.title)}</div>
      <span class="listing-detail-cat">${esc(l.category)}</span>

      <div class="listing-seller-row">
        <div class="listing-seller-avatar">${sellerInitials}</div>
        <div class="listing-seller-info">
          <div class="listing-seller-name">${esc(l.seller_name || 'Seller')}</div>
          <div class="listing-seller-joined">One Culture member</div>
        </div>
      </div>

      ${!isOwner && currentUser ? `<button class="listing-msg-btn" id="msgSellerBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Message Seller</button>` : ''}
      ${!isOwner && !currentUser ? `<button class="listing-msg-btn" id="msgSellerBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Sign in to Message</button>` : ''}

      ${l.description ? `<div class="listing-detail-desc"><div class="listing-detail-desc-label">Description</div>${esc(l.description)}</div>` : ''}

      ${isOwner ? `<button class="listing-delete-btn" id="deleteListingBtn">Delete listing</button>` : ''}
    </div>`;

  const msgBtn = document.getElementById('msgSellerBtn');
  if (msgBtn) {
    msgBtn.addEventListener('click', () => {
      if (!currentUser) { listingOverlay.classList.remove('open'); document.body.style.overflow = ''; openAuth(); return; }
      location.href = `messages.html`;
    });
  }

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

  const imgWrap = document.getElementById('listingDetailImg');
  if (imgWrap) {
    const track = imgWrap.querySelector('.carousel-track');
    if (track) {
      const dots = imgWrap.querySelectorAll('.carousel-dot');
      const countEl = imgWrap.querySelector('.carousel-count');
      const total = parseInt(track.dataset.count);
      track.addEventListener('scroll', () => {
        const idx = Math.round(track.scrollLeft / track.clientWidth);
        dots.forEach((d, i) => d.classList.toggle('active', i === idx));
        if (countEl) countEl.textContent = `${idx + 1} / ${total}`;
      }, { passive: true });
    }
  }
}

document.getElementById('listingClose').addEventListener('click', () => { listingOverlay.classList.remove('open'); document.body.style.overflow = ''; });
listingOverlay.addEventListener('click', e => { if (e.target === listingOverlay) { listingOverlay.classList.remove('open'); document.body.style.overflow = ''; } });

// ── Search ─────────────────────────────────────────────────
document.getElementById('marketSearch').addEventListener('input', filterAndRender);

// ── Category tabs ──────────────────────────────────────────
document.getElementById('marketCats').addEventListener('click', e => {
  const tab = e.target.closest('.cat-tab');
  if (!tab) return;
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  activeCategory = tab.dataset.cat;
  filterAndRender();
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

listingImageInput.setAttribute('multiple', 'true');
listingUploadZone.addEventListener('click', () => listingImageInput.click());
listingImageInput.addEventListener('change', e => {
  Array.from(e.target.files).forEach(f => { if (listingFiles.length < 10) listingFiles.push(f); });
  e.target.value = '';
  renderListingThumbs();
});

function renderListingThumbs() {
  listingUploadZone.style.display = 'none';
  listingPreview.style.display = 'none';
  let thumbsEl = document.getElementById('listingThumbsGrid');
  if (!thumbsEl) {
    thumbsEl = document.createElement('div');
    thumbsEl.id = 'listingThumbsGrid';
    thumbsEl.className = 'upload-thumbs';
    listingUploadZone.parentNode.insertBefore(thumbsEl, listingUploadZone.nextSibling);
  }
  thumbsEl.innerHTML = '';
  listingFiles.forEach((f, i) => {
    const div = document.createElement('div');
    div.className = 'upload-thumb';
    const img = document.createElement('img');
    img.src = URL.createObjectURL(f);
    const rm = document.createElement('button');
    rm.className = 'upload-thumb-rm';
    rm.innerHTML = '×';
    rm.addEventListener('click', () => { listingFiles.splice(i, 1); renderListingThumbs(); });
    div.appendChild(img); div.appendChild(rm);
    thumbsEl.appendChild(div);
  });
  if (listingFiles.length < 10) {
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'upload-add-more';
    add.innerHTML = '+';
    add.addEventListener('click', () => listingImageInput.click());
    thumbsEl.appendChild(add);
  }
  if (!listingFiles.length) { listingUploadZone.style.display = ''; thumbsEl.style.display = 'none'; }
  else thumbsEl.style.display = 'grid';
}

document.getElementById('submitListingBtn').addEventListener('click', async () => {
  const title = document.getElementById('listingTitle').value.trim();
  const price = document.getElementById('listingPrice').value.trim();
  const err = document.getElementById('createListingError');
  if (!title || !price) { err.textContent = 'Title and price are required.'; return; }
  err.textContent = '';

  const fd = new FormData();
  listingFiles.forEach(f => fd.append('images', f));
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
    listingFiles = [];
    const thumbsGrid = document.getElementById('listingThumbsGrid');
    if (thumbsGrid) { thumbsGrid.innerHTML = ''; thumbsGrid.style.display = 'none'; }
    listingPreview.style.display = 'none'; listingUploadZone.style.display = '';
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
    localStorage.setItem('culture-token', token);
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
    localStorage.setItem('culture-token', token);
    authOverlay.classList.remove('open'); document.body.style.overflow = '';
    renderNav(currentUser); await loadListings(activeCategory);
  } catch { document.getElementById('regError').textContent = 'Network error.'; }
});

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

(async () => { await loadMe(); await loadListings('All'); })();
