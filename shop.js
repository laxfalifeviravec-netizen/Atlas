/* One Culture — Shop JS */

const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001' : '';

let token = localStorage.getItem('culture-token');
if (!token) location.replace('index.html');
let page = 1;
let totalPages = 1;
let allPosts = [];
let activeShopCat = 'All';

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
  if (!token) return location.replace('index.html');
  try {
    const res = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { token = null; localStorage.removeItem('culture-token'); location.replace('index.html'); return; }
    const { user } = await res.json();
    renderNav(user);
  } catch {}
}

function renderNav(user) {
  const el = document.getElementById('navAuth');
  if (!el || !user) return;
  const init = user.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  el.innerHTML = `
    <a href="profile.html?id=${user.id}" class="nav-user-btn"><div class="avatar avatar-sm">${init}</div></a>
    <button class="nav-signout-btn" id="navSignOut">Sign Out</button>`;
  document.getElementById('navSignOut').addEventListener('click', () => {
    localStorage.removeItem('culture-token'); location.replace('index.html');
  });
}

// ── Category tabs ──────────────────────────────────────────
document.getElementById('shopCats')?.addEventListener('click', e => {
  const btn = e.target.closest('.shop-cat');
  if (!btn) return;
  document.querySelectorAll('.shop-cat').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  activeShopCat = btn.dataset.cat || 'All';
  loadShop(true);
});

// ── Shop Feed ──────────────────────────────────────────────
async function loadShop(reset = false) {
  if (reset) { page = 1; allPosts = []; document.getElementById('shopGrid').innerHTML = ''; }
  document.getElementById('shopLoading').style.display = 'flex';
  try {
    const cat = activeShopCat && activeShopCat !== 'All' ? `?category=${encodeURIComponent(activeShopCat)}` : '';
    const res = await fetch(`${API}/api/shop${cat}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    const data = await res.json();
    const posts = Array.isArray(data) ? data : (data.posts || []);
    allPosts = reset ? posts : [...allPosts, ...posts];
    renderShop(posts, reset);
    document.getElementById('shopEmpty').style.display = allPosts.length === 0 ? 'flex' : 'none';
    document.getElementById('shopLoadMore').style.display = 'none';
  } catch {}
  document.getElementById('shopLoading').style.display = 'none';
}

function renderShop(posts, reset) {
  const grid = document.getElementById('shopGrid');
  if (reset) grid.innerHTML = '';
  posts.forEach(p => grid.appendChild(buildShopCard(p)));
}

function buildShopCard(p) {
  const imgSrc   = p.image_url ? (p.image_url.startsWith('http') ? p.image_url : `${API}${p.image_url}`) : null;
  const initials = (p.user_name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const timeStr  = formatTime(p.created_at);

  const card = document.createElement('div');
  card.className = 'shop-card';
  card.innerHTML = `
    ${imgSrc
      ? `<img class="shop-card-img" src="${imgSrc}" alt="${esc(p.mod_title||'Mod')}" loading="lazy" />`
      : `<div class="shop-card-img shop-card-img-placeholder">🔧</div>`}
    <div class="shop-card-body">
      <div class="shop-card-top">
        <div class="shop-card-author">
          <a href="profile.html?id=${p.user_id}">${esc(p.user_name||'Driver')}</a>
        </div>
        ${p.mod_category ? `<span class="shop-cat-badge">${esc(p.mod_category)}</span>` : ''}
      </div>
      <div class="shop-mod-row">
        <div class="shop-mod-info">
          <span class="shop-mod-name">${esc(p.mod_title)}</span>
          ${p.mod_price ? `<span class="shop-mod-price">${esc(p.mod_price)}</span>` : ''}
        </div>
        ${p.mod_url ? `<a href="${esc(p.mod_url)}" target="_blank" rel="noopener noreferrer" class="shop-mod-btn">View</a>` : ''}
      </div>
      ${p.caption ? `<div class="shop-card-caption">${esc(p.caption)}</div>` : ''}
      <div class="shop-card-time">${timeStr}</div>
    </div>
  `;
  return card;
}

document.getElementById('loadMoreBtn').addEventListener('click', () => { page++; loadShop(); });

function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts.includes('T') ? ts : ts + 'Z');
  const diff = (Date.now() - d) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

(async () => {
  await loadMe();
  await loadShop(true);
})();
