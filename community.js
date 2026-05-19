/* ============================================================
   Atlas — Community Page JS
   ============================================================ */

const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3001'
  : '';

// ── Theme ─────────────────────────────────────────────────────
const themeToggle = document.getElementById('themeToggle');
const savedTheme  = localStorage.getItem('atlas-theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('atlas-theme', next);
});

// ── Navbar ────────────────────────────────────────────────────
const navbar    = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 10), { passive: true });
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.classList.toggle('active', open);
  navToggle.setAttribute('aria-expanded', open);
});
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  navLinks.classList.remove('open');
  navToggle.classList.remove('active');
}));

// ── Back to top ───────────────────────────────────────────────
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => backToTop.classList.toggle('visible', window.scrollY > 400), { passive: true });
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ── Auth state ────────────────────────────────────────────────
let currentUser = null;
let authToken   = localStorage.getItem('atlas-token') || null;

function authHeaders() {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

async function fetchCurrentUser() {
  if (!authToken) return;
  try {
    const res  = await fetch(`${API}/api/auth/me`, { headers: authHeaders() });
    if (!res.ok) { authToken = null; localStorage.removeItem('atlas-token'); return; }
    const data = await res.json();
    currentUser = data.user;
  } catch {
    // server not reachable
  }
}

function renderNavAuth() {
  const navAuth = document.getElementById('navAuth');
  if (!navAuth) return;
  if (currentUser) {
    navAuth.innerHTML = `
      <button class="nav-user-btn">
        <div class="avatar avatar-sm">${avatarInitials(currentUser.name)}</div>
        ${currentUser.name.split(' ')[0]}
      </button>
      <button class="nav-signout-btn" id="signOutBtn">Sign Out</button>
    `;
    document.getElementById('signOutBtn').addEventListener('click', signOut);
  } else {
    navAuth.innerHTML = `<button class="nav-signin-btn" id="navSignInBtn">Sign In</button>`;
    document.getElementById('navSignInBtn').addEventListener('click', () => openAuth('login'));
  }
}

function signOut() {
  authToken   = null;
  currentUser = null;
  localStorage.removeItem('atlas-token');
  renderNavAuth();
  loadFeed(1, true);
}

function avatarInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function avatarEl(name, avatarUrl, size = '') {
  if (avatarUrl) return `<div class="avatar ${size}"><img src="${avatarUrl}" alt="${escHtml(name)}" /></div>`;
  return `<div class="avatar ${size}">${avatarInitials(name)}</div>`;
}

// ── Feed state ────────────────────────────────────────────────
let feedMode   = 'recent'; // 'recent' | 'top'
let currentPage = 1;
let totalPages  = 1;

const feedGrid       = document.getElementById('feedGrid');
const feedLoading    = document.getElementById('feedLoading');
const feedEmpty      = document.getElementById('feedEmpty');
const feedPagination = document.getElementById('feedPagination');
const loadMoreBtn    = document.getElementById('loadMoreBtn');

async function loadFeed(page = 1, reset = false) {
  if (reset) { feedGrid.innerHTML = ''; currentPage = 1; }
  feedLoading.style.display = 'flex';
  feedEmpty.style.display   = 'none';
  feedPagination.style.display = 'none';

  try {
    const sortParam = feedMode === 'top' ? '&sort=likes' : '';
    const res  = await fetch(`${API}/api/posts?page=${page}&limit=12${sortParam}`, { headers: authHeaders() });
    const data = await res.json();

    totalPages = data.pages;

    if (data.posts.length === 0 && page === 1) {
      feedEmpty.style.display = 'flex';
    } else {
      data.posts.forEach(post => feedGrid.appendChild(buildPostCard(post)));
    }

    if (currentPage < totalPages) {
      feedPagination.style.display = 'block';
    }
  } catch {
    if (page === 1) feedEmpty.style.display = 'flex';
  } finally {
    feedLoading.style.display = 'none';
  }
}

loadMoreBtn.addEventListener('click', () => {
  currentPage++;
  loadFeed(currentPage);
});

// ── Feed tabs ─────────────────────────────────────────────────
document.querySelectorAll('.feed-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    feedMode = tab.dataset.feed;
    loadFeed(1, true);
  });
});

// ── Post card builder ─────────────────────────────────────────
function buildPostCard(post) {
  const card = document.createElement('article');
  card.className = 'post-card';
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `View post by ${post.user_name}`);

  card.innerHTML = `
    <div class="post-card-img-wrap">
      <img src="${post.image_url}" alt="${escHtml(post.road_name || 'Road photo')}" loading="lazy" />
      <div class="post-card-overlay">
        <div class="post-card-overlay-likes">
          <svg viewBox="0 0 24 24" fill="#fff" stroke="none" width="16" height="16"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          ${post.likes}
        </div>
      </div>
    </div>
    <div class="post-card-body">
      <div class="post-card-author">
        ${avatarEl(post.user_name, post.user_avatar, 'avatar-sm')}
        <span class="post-card-author-name">${escHtml(post.user_name)}</span>
      </div>
      ${post.road_name ? `<div class="post-card-road">${escHtml(post.road_name)}</div>` : ''}
      ${post.caption   ? `<p class="post-card-caption">${escHtml(post.caption)}</p>` : ''}
    </div>
    <div class="post-card-footer">
      <div class="post-card-stats">
        <span class="post-stat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          ${post.likes}
        </span>
      </div>
      <span class="post-card-date">${timeAgo(post.created_at)}</span>
    </div>
  `;

  const open = () => openPostModal(post);
  card.addEventListener('click', open);
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });
  return card;
}

// ── Post detail modal ─────────────────────────────────────────
const postOverlay    = document.getElementById('postOverlay');
const postModalClose = document.getElementById('postModalClose');
let activePostId     = null;

async function openPostModal(post) {
  activePostId = post.id;
  document.getElementById('postModalImg').src = post.image_url;
  document.getElementById('postModalImg').alt = escHtml(post.road_name || 'Road photo');

  document.getElementById('postModalAuthor').innerHTML = `
    ${avatarEl(post.user_name, post.user_avatar, 'avatar-lg')}
    <div class="post-modal-author-info">
      <span class="post-modal-author-name">${escHtml(post.user_name)}</span>
      <span class="post-modal-author-date">${timeAgo(post.created_at)}</span>
    </div>
  `;

  const roadEl = document.getElementById('postModalRoad');
  roadEl.innerHTML = post.road_name
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${escHtml(post.road_name)}${post.region ? ` · ${escHtml(post.region)}` : ''}`
    : '';

  document.getElementById('postModalCaption').textContent = post.caption || '';

  renderPostActions(post);
  await loadComments(post.id);

  postOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  postModalClose.focus();
}

function renderPostActions(post) {
  const actionsEl = document.getElementById('postModalActions');
  const liked     = post.liked || false;
  actionsEl.innerHTML = `
    <button class="like-btn ${liked ? 'liked' : ''}" id="likeBtn" aria-label="Like post" aria-pressed="${liked}">
      <svg viewBox="0 0 24 24" fill="${liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
      <span id="likeCount">${post.likes}</span>
    </button>
  `;

  document.getElementById('likeBtn').addEventListener('click', async () => {
    if (!currentUser) { openAuth('login'); return; }
    try {
      const res  = await fetch(`${API}/api/posts/${post.id}/like`, { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      post.liked = data.liked;
      post.likes = data.likes;
      renderPostActions(post);
      // Update card in grid
      updateCardLikes(post.id, data.likes);
    } catch {}
  });
}

function updateCardLikes(postId, likes) {
  // update the stat in the feed card (if visible)
  const cards = feedGrid.querySelectorAll('.post-card');
  cards.forEach(card => {
    // We don't store post id on card, so update all likes counts by text
    // (re-render is simpler; for production we'd store data-id)
  });
}

async function loadComments(postId) {
  const commentsEl = document.getElementById('postModalComments');
  commentsEl.innerHTML = '<div class="feed-loading" style="padding:1rem 0"><div class="spinner"></div></div>';
  try {
    const res  = await fetch(`${API}/api/posts/${postId}/comments`);
    const data = await res.json();
    renderComments(data.comments);
  } catch {
    commentsEl.innerHTML = '';
  }
}

function renderComments(comments) {
  const el = document.getElementById('postModalComments');
  if (!comments.length) {
    el.innerHTML = '<p class="comments-empty">No comments yet. Be the first.</p>';
    return;
  }
  el.innerHTML = comments.map(c => `
    <div class="comment-item">
      ${avatarEl(c.user_name, c.user_avatar, 'avatar-sm')}
      <div class="comment-content">
        <div class="comment-author">${escHtml(c.user_name)}</div>
        <div class="comment-body">${escHtml(c.body)}</div>
        <div class="comment-date">${timeAgo(c.created_at)}</div>
      </div>
    </div>
  `).join('');
}

function closePostModal() {
  postOverlay.classList.remove('open');
  document.body.style.overflow = '';
  activePostId = null;
}

postModalClose.addEventListener('click', closePostModal);
postOverlay.addEventListener('click', e => { if (e.target === postOverlay) closePostModal(); });

// Comment submit
document.getElementById('postCommentForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentUser) { openAuth('login'); return; }
  const input = document.getElementById('postCommentInput');
  const body  = input.value.trim();
  if (!body) return;
  try {
    const res  = await fetch(`${API}/api/posts/${activePostId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ body }),
    });
    if (!res.ok) return;
    const data = await res.json();
    input.value = '';
    await loadComments(activePostId);
    // scroll comments to bottom
    const commentsEl = document.getElementById('postModalComments');
    commentsEl.scrollTop = commentsEl.scrollHeight;
  } catch {}
});

// ── New post modal ────────────────────────────────────────────
const newPostOverlay = document.getElementById('newPostOverlay');
const newPostClose   = document.getElementById('newPostClose');

function openNewPost() {
  if (!currentUser) { openAuth('login', () => openNewPost()); return; }
  document.getElementById('postImageInput').value = '';
  document.getElementById('uploadPreview').style.display = 'none';
  document.getElementById('uploadZone').style.display    = 'flex';
  document.getElementById('postRoadName').value = '';
  document.getElementById('postRegion').value   = '';
  document.getElementById('postCaption').value  = '';
  document.getElementById('newPostError').textContent = '';
  newPostOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeNewPost() {
  newPostOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

newPostClose.addEventListener('click', closeNewPost);
newPostOverlay.addEventListener('click', e => { if (e.target === newPostOverlay) closeNewPost(); });
document.getElementById('heroPostBtn').addEventListener('click', openNewPost);
document.getElementById('newPostBtn').addEventListener('click', openNewPost);
document.getElementById('emptyPostBtn').addEventListener('click', openNewPost);

// File upload zone
const uploadZone     = document.getElementById('uploadZone');
const postImageInput = document.getElementById('postImageInput');
const uploadPreview  = document.getElementById('uploadPreview');

uploadZone.addEventListener('click', () => postImageInput.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) showPreview(file);
});
postImageInput.addEventListener('change', () => {
  if (postImageInput.files[0]) showPreview(postImageInput.files[0]);
});

function showPreview(file) {
  const reader = new FileReader();
  reader.onload = e => {
    uploadPreview.src = e.target.result;
    uploadPreview.style.display = 'block';
    uploadZone.style.display    = 'none';
  };
  reader.readAsDataURL(file);
}

document.getElementById('submitPostBtn').addEventListener('click', async () => {
  const file      = postImageInput.files[0];
  const roadName  = document.getElementById('postRoadName').value.trim();
  const region    = document.getElementById('postRegion').value;
  const caption   = document.getElementById('postCaption').value.trim();
  const errorEl   = document.getElementById('newPostError');
  errorEl.textContent = '';

  if (!file) { errorEl.textContent = 'Please select a photo.'; return; }
  if (!roadName) { errorEl.textContent = 'Please enter the road name.'; return; }

  const btn = document.getElementById('submitPostBtn');
  btn.disabled = true;
  btn.textContent = 'Uploading…';

  try {
    const form = new FormData();
    form.append('image',     file);
    form.append('road_name', roadName);
    form.append('region',    region);
    form.append('caption',   caption);

    const res = await fetch(`${API}/api/posts`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    });

    const data = await res.json();
    if (!res.ok) { errorEl.textContent = data.error || 'Upload failed.'; return; }

    closeNewPost();
    feedGrid.prepend(buildPostCard(data.post));
    feedEmpty.style.display = 'none';
  } catch {
    errorEl.textContent = 'Upload failed — is the server running?';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Share Road';
  }
});

// ── Auth modal ────────────────────────────────────────────────
const authOverlay  = document.getElementById('authOverlay');
const authClose    = document.getElementById('authClose');
let authMode       = 'login'; // 'login' | 'register'
let afterAuthCb    = null;

function openAuth(mode = 'login', callback = null) {
  authMode  = mode;
  afterAuthCb = callback;
  switchAuthMode(mode);
  clearAuthErrors();
  authOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (mode === 'login') document.getElementById('loginEmail').focus();
  else document.getElementById('regName').focus();
}

function closeAuth() {
  authOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

function switchAuthMode(mode) {
  authMode = mode;
  document.getElementById('authTitle').textContent      = mode === 'login' ? 'Sign In'         : 'Create Account';
  document.getElementById('loginForm').style.display    = mode === 'login' ? ''                : 'none';
  document.getElementById('registerForm').style.display = mode === 'login' ? 'none'            : '';
  document.getElementById('authSwitchText').textContent = mode === 'login' ? "Don't have an account?" : 'Already have an account?';
  document.getElementById('authSwitchBtn').textContent  = mode === 'login' ? 'Sign Up'         : 'Sign In';
  clearAuthErrors();
}

function clearAuthErrors() {
  ['loginEmailError','loginPasswordError','loginError','regNameError','regEmailError','regPasswordError','regError'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

authClose.addEventListener('click', closeAuth);
authOverlay.addEventListener('click', e => { if (e.target === authOverlay) closeAuth(); });
document.getElementById('authSwitchBtn').addEventListener('click', () => switchAuthMode(authMode === 'login' ? 'register' : 'login'));

// Login submit
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  clearAuthErrors();
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  let valid = true;
  if (!email)    { document.getElementById('loginEmailError').textContent = 'Required.'; valid = false; }
  if (!password) { document.getElementById('loginPasswordError').textContent = 'Required.'; valid = false; }
  if (!valid) return;

  try {
    const res  = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) { document.getElementById('loginError').textContent = data.error; return; }
    authToken   = data.token;
    currentUser = data.user;
    localStorage.setItem('atlas-token', authToken);
    closeAuth();
    renderNavAuth();
    loadFeed(1, true);
    if (afterAuthCb) { afterAuthCb(); afterAuthCb = null; }
  } catch {
    document.getElementById('loginError').textContent = 'Could not connect to server.';
  }
});

// Register submit
document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  clearAuthErrors();
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  let valid = true;
  if (!name)              { document.getElementById('regNameError').textContent = 'Required.'; valid = false; }
  if (!email)             { document.getElementById('regEmailError').textContent = 'Required.'; valid = false; }
  if (password.length < 6){ document.getElementById('regPasswordError').textContent = 'Min 6 characters.'; valid = false; }
  if (!valid) return;

  try {
    const res  = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) { document.getElementById('regError').textContent = data.error; return; }
    authToken   = data.token;
    currentUser = data.user;
    localStorage.setItem('atlas-token', authToken);
    closeAuth();
    renderNavAuth();
    loadFeed(1, true);
    if (afterAuthCb) { afterAuthCb(); afterAuthCb = null; }
  } catch {
    document.getElementById('regError').textContent = 'Could not connect to server.';
  }
});

// Escape closes any open modal
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (authOverlay.classList.contains('open'))    closeAuth();
  if (newPostOverlay.classList.contains('open')) closeNewPost();
  if (postOverlay.classList.contains('open'))    closePostModal();
});

// ── Shared content modals (footer) ───────────────────────────
const MODAL_CONTENT = {
  about: {
    title: 'About Atlas',
    body: `<p>Atlas is the definitive guide to America's best driving roads — built by enthusiasts, for enthusiasts.</p>
      <h4>Our Mission</h4><p>There are thousands of incredible roads in America that most drivers will never discover. Atlas exists to change that.</p>
      <h4>What We Build</h4><ul><li>1,200+ mapped and rated driving roads across all 50 states</li><li>Real-time road condition alerts and seasonal closure tracking</li><li>Elevation profiles and technical difficulty ratings</li><li>Community-driven reviews from 85,000+ active drivers</li></ul>
      <p style="margin-top:1.5rem;color:var(--color-text-muted);font-size:0.9rem;">Founded in 2022 &middot; Headquartered in Asheville, NC</p>`,
  },
  privacy: {
    title: 'Privacy Policy',
    body: `<p><em>Effective date: January 1, 2026</em></p><h4>Information We Collect</h4><p>Atlas collects only the information necessary to provide our services, including account data and anonymised usage analytics.</p><h4>We Never Sell Your Data</h4><p>Atlas does not sell, rent, or share your personal information with third parties for marketing purposes.</p><h4>Contact</h4><p>Questions? Email <a href="mailto:privacy@atlas.app">privacy@atlas.app</a>.</p>`,
  },
  terms: {
    title: 'Terms of Service',
    body: `<p><em>Effective date: January 1, 2026</em></p><h4>Acceptance</h4><p>By using Atlas, you agree to these terms. Subscriptions auto-renew until cancelled. You may cancel at any time.</p><h4>Contact</h4><p>Questions? Email <a href="mailto:legal@atlas.app">legal@atlas.app</a>.</p>`,
  },
};

const modalOverlay = document.getElementById('modalOverlay');
const modalTitle   = document.getElementById('modalTitle');
const modalBody    = document.getElementById('modalBody');
const modalClose   = document.getElementById('modalClose');

function openModal(key) {
  const content = MODAL_CONTENT[key];
  if (!content) return;
  modalTitle.textContent = content.title;
  modalBody.innerHTML    = content.body;
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  modalClose.focus();
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.querySelectorAll('[data-modal]').forEach(link => {
  link.addEventListener('click', e => { e.preventDefault(); openModal(link.dataset.modal); });
});
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

// ── Utilities ─────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)   return 'just now';
  if (min < 60)  return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)   return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30)  return `${day}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Init ──────────────────────────────────────────────────────
(async () => {
  await fetchCurrentUser();
  renderNavAuth();
  await loadFeed(1, true);
})();
