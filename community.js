/* ============================================================
   Atlas — Community JS (Instagram-style feed)
   ============================================================ */

const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001' : '';

let token = localStorage.getItem('atlas-token');
let currentUser = null;
let posts = [];
let page = 1;
let totalPages = 1;
let activePost = null;
let allStories = [];
let storyIndex = 0;
let storyTimer = null;

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
    currentUser = user;
    renderNav(user);
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

// ── Stories ────────────────────────────────────────────────
async function loadStories() {
  try {
    const res = await fetch(`${API}/api/stories`);
    const { stories } = await res.json();
    allStories = stories;
    renderStories(stories);
  } catch {}
}

function renderStories(stories) {
  const scroll = document.getElementById('storiesScroll');
  // Keep the add button
  const addBtn = scroll.querySelector('.story-add');
  // Clear others
  scroll.querySelectorAll('.story-item:not(.story-add)').forEach(el => el.remove());

  stories.forEach((s, i) => {
    const initials = (s.user_name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
    const btn = document.createElement('button');
    btn.className = 'story-item';
    btn.innerHTML = `
      <div class="story-avatar-wrap">
        <div class="story-avatar-inner">${initials}</div>
      </div>
      <span>${(s.user_name||'').split(' ')[0] || 'Driver'}</span>`;
    btn.addEventListener('click', () => openStoryViewer(i));
    scroll.appendChild(btn);
  });
}

function openStoryViewer(idx) {
  storyIndex = idx;
  document.getElementById('storyOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  buildStoryBars();
  showStory(idx);
}

function buildStoryBars() {
  const barsEl = document.getElementById('storyBars');
  if (!barsEl) return;
  barsEl.innerHTML = allStories.map(() =>
    `<div class="story-bar-seg"><div class="story-bar-fill"></div></div>`
  ).join('');
}

function showStory(idx) {
  if (idx < 0 || idx >= allStories.length) { closeStoryViewer(); return; }
  storyIndex = idx;
  const s = allStories[idx];
  document.getElementById('storyViewImg').src = s.image_url.startsWith('http') ? s.image_url : `${API}${s.image_url}`;
  document.getElementById('storyInfo').innerHTML = s.road_name ? `<span>${esc(s.road_name)}</span>` : '';

  // User header
  const initials = (s.user_name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const timeAgo = formatTime(s.created_at);
  const userHdr = document.getElementById('storyUserHeader');
  if (userHdr) {
    userHdr.innerHTML = `
      <div class="story-user-avatar">${initials}</div>
      <div>
        <div class="story-user-name">${esc(s.user_name||'Driver')}</div>
        <div class="story-user-time">${timeAgo}</div>
      </div>`;
  }

  // Progress bars — mark past as done, reset current, clear future
  const fills = document.querySelectorAll('.story-bar-fill');
  fills.forEach((f, i) => {
    f.style.transition = 'none';
    if (i < idx) { f.style.width = '100%'; f.classList.add('done'); }
    else if (i === idx) {
      f.classList.remove('done'); f.style.width = '0%';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          f.style.transition = 'width 5s linear'; f.style.width = '100%';
        });
      });
    } else { f.classList.remove('done'); f.style.width = '0%'; }
  });

  clearTimeout(storyTimer);
  storyTimer = setTimeout(() => showStory(idx + 1), 5100);
}

function closeStoryViewer() {
  document.getElementById('storyOverlay').classList.remove('open');
  document.body.style.overflow = '';
  clearTimeout(storyTimer);
}

document.getElementById('storyPrev').addEventListener('click', () => { clearTimeout(storyTimer); showStory(storyIndex - 1); });
document.getElementById('storyNext').addEventListener('click', () => { clearTimeout(storyTimer); showStory(storyIndex + 1); });
document.getElementById('storyClose').addEventListener('click', closeStoryViewer);

// ── Story Upload ───────────────────────────────────────────
const newStoryOverlay = document.getElementById('newStoryOverlay');
const storyUploadZone = document.getElementById('storyUploadZone');
const storyImageInput = document.getElementById('storyImageInput');
const storyPreview    = document.getElementById('storyPreview');
let storyFile = null;

document.getElementById('addStoryBtn').addEventListener('click', () => {
  if (!currentUser) return openAuth();
  newStoryOverlay.classList.add('open');
});
document.getElementById('newStoryBtn').addEventListener('click', () => {
  if (!currentUser) return openAuth();
  newStoryOverlay.classList.add('open');
});
document.getElementById('newStoryClose').addEventListener('click', () => newStoryOverlay.classList.remove('open'));
newStoryOverlay.addEventListener('click', e => { if (e.target === newStoryOverlay) newStoryOverlay.classList.remove('open'); });

storyUploadZone.addEventListener('click', () => storyImageInput.click());
storyImageInput.addEventListener('change', e => {
  storyFile = e.target.files[0];
  if (storyFile) {
    const url = URL.createObjectURL(storyFile);
    storyPreview.src = url; storyPreview.style.display = 'block';
    storyUploadZone.style.display = 'none';
  }
});

document.getElementById('submitStoryBtn').addEventListener('click', async () => {
  if (!storyFile) { document.getElementById('storyError').textContent = 'Please select an image.'; return; }
  const fd = new FormData();
  fd.append('image', storyFile);
  fd.append('road_name', document.getElementById('storyRoadName').value.trim());
  try {
    const res = await fetch(`${API}/api/stories`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    if (!res.ok) { const d = await res.json(); document.getElementById('storyError').textContent = d.error; return; }
    newStoryOverlay.classList.remove('open');
    storyFile = null; storyPreview.style.display = 'none'; storyUploadZone.style.display = '';
    document.getElementById('storyRoadName').value = '';
    await loadStories();
  } catch { document.getElementById('storyError').textContent = 'Upload failed. Try again.'; }
});

// ── Feed ───────────────────────────────────────────────────
async function loadFeed(reset = false) {
  if (reset) { page = 1; posts = []; document.getElementById('feedList').innerHTML = ''; }
  document.getElementById('feedLoading').style.display = 'flex';
  try {
    const res = await fetch(`${API}/api/posts?page=${page}&limit=10`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const data = await res.json();
    totalPages = data.pages;
    posts = reset ? data.posts : [...posts, ...data.posts];
    renderFeed(data.posts, reset);
    document.getElementById('feedEmpty').style.display = posts.length === 0 ? 'flex' : 'none';
    document.getElementById('feedLoadMore').style.display = page < totalPages ? 'flex' : 'none';
  } catch {}
  document.getElementById('feedLoading').style.display = 'none';
}

function renderFeed(newPosts, reset) {
  const list = document.getElementById('feedList');
  if (reset) list.innerHTML = '';
  newPosts.forEach(p => list.appendChild(buildPostCard(p)));
}

function buildPostCard(p) {
  const initials = (p.user_name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const imgSrc   = p.image_url.startsWith('http') ? p.image_url : `${API}${p.image_url}`;
  const timeStr  = formatTime(p.created_at);

  const card = document.createElement('article');
  card.className = 'post-card';
  card.innerHTML = `
    <div class="post-card-header">
      <div class="post-avatar">${initials}</div>
      <div class="post-card-meta">
        <div class="post-card-username">${esc(p.user_name||'Driver')}</div>
        <div class="post-card-road">${esc(p.road_name||p.region||'')}</div>
      </div>
    </div>
    <div class="post-card-img-wrap">
      <img src="${imgSrc}" alt="${esc(p.road_name||'Road photo')}" loading="lazy" />
    </div>
    <div class="post-card-actions">
      <button class="post-action-btn like-btn${p.liked?' liked':''}" data-id="${p.id}" data-liked="${p.liked}" aria-label="Like">
        <svg viewBox="0 0 24 24" fill="${p.liked?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        <span class="action-count like-count">${p.likes}</span>
      </button>
      <button class="post-action-btn comment-btn" data-id="${p.id}" aria-label="Comment">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </button>
      <button class="post-action-btn share-btn" data-id="${p.id}" aria-label="Share">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
    <div class="post-card-likes">${p.likes} like${p.likes===1?'':'s'}</div>
    ${p.caption ? `<div class="post-card-caption"><strong>${esc(p.user_name||'')}</strong>${esc(p.caption)}</div>` : ''}
    <div class="post-card-time">${timeStr}</div>
  `;

  card.querySelector('.like-btn').addEventListener('click', e => toggleLike(p, e.currentTarget, card));
  card.querySelector('.comment-btn').addEventListener('click', () => openPostModal(p));
  card.querySelector('.post-card-img-wrap img').addEventListener('dblclick', e => {
    const btn = card.querySelector('.like-btn');
    if (!p.liked) toggleLike(p, btn, card);
  });
  return card;
}

async function toggleLike(post, btn, card) {
  if (!currentUser) return openAuth();
  const wasLiked = btn.dataset.liked === 'true';
  try {
    const res = await fetch(`${API}/api/posts/${post.id}/like`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    post.liked = data.liked; post.likes = data.likes;
    btn.dataset.liked = data.liked;
    btn.classList.toggle('liked', data.liked);
    btn.querySelector('svg').setAttribute('fill', data.liked ? 'currentColor' : 'none');
    btn.querySelector('.like-count').textContent = data.likes;
    card.querySelector('.post-card-likes').textContent = `${data.likes} like${data.likes===1?'':'s'}`;
  } catch {}
}

document.getElementById('loadMoreBtn').addEventListener('click', () => { page++; loadFeed(); });
document.getElementById('emptyPostBtn').addEventListener('click', openNewPost);

// ── Post Modal ─────────────────────────────────────────────
const postOverlay = document.getElementById('postOverlay');

async function openPostModal(post) {
  activePost = post;
  const imgSrc = post.image_url.startsWith('http') ? post.image_url : `${API}${post.image_url}`;
  document.getElementById('postModalImg').src = imgSrc;
  const initials = (post.user_name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  document.getElementById('postModalAuthor').innerHTML = `<div class="post-avatar" style="display:inline-flex;margin-right:8px;">${initials}</div><strong>${esc(post.user_name||'Driver')}</strong>`;
  document.getElementById('postModalRoad').textContent = post.road_name || post.region || '';
  document.getElementById('postModalCaption').textContent = post.caption || '';
  document.getElementById('postModalActions').innerHTML = `
    <button class="post-action-btn${post.liked?' liked':''}" id="modalLikeBtn" data-liked="${post.liked}">
      <svg viewBox="0 0 24 24" fill="${post.liked?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      <span id="modalLikeCount">${post.likes} like${post.likes===1?'':'s'}</span>
    </button>`;
  document.getElementById('modalLikeBtn').addEventListener('click', async () => {
    if (!currentUser) return openAuth();
    const res = await fetch(`${API}/api/posts/${post.id}/like`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    post.liked = data.liked; post.likes = data.likes;
    const btn = document.getElementById('modalLikeBtn');
    btn.dataset.liked = data.liked;
    btn.classList.toggle('liked', data.liked);
    btn.querySelector('svg').setAttribute('fill', data.liked ? 'currentColor' : 'none');
    document.getElementById('modalLikeCount').textContent = `${data.likes} like${data.likes===1?'':'s'}`;
  });
  await loadComments(post.id);
  postOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

async function loadComments(postId) {
  const box = document.getElementById('postModalComments');
  box.innerHTML = '<div class="feed-loading" style="padding:12px"><div class="spinner" style="width:20px;height:20px;border-width:2px"></div></div>';
  try {
    const res = await fetch(`${API}/api/posts/${postId}/comments`);
    const { comments } = await res.json();
    box.innerHTML = comments.length === 0 ? '<p style="color:var(--c-text-2);font-size:13px">No comments yet.</p>' :
      comments.map(c => `
        <div class="comment-item">
          <strong>${esc(c.user_name||'Driver')}</strong>${esc(c.body)}
          <span class="comment-time">${formatTime(c.created_at)}</span>
        </div>`).join('');
  } catch { box.innerHTML = ''; }
}

document.getElementById('postModalClose').addEventListener('click', () => {
  postOverlay.classList.remove('open'); document.body.style.overflow = '';
});
postOverlay.addEventListener('click', e => {
  if (e.target === postOverlay) { postOverlay.classList.remove('open'); document.body.style.overflow = ''; }
});

document.getElementById('postCommentForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentUser) return openAuth();
  const input = document.getElementById('postCommentInput');
  const body = input.value.trim();
  if (!body) return;
  try {
    const res = await fetch(`${API}/api/posts/${activePost.id}/comments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });
    if (res.ok) { input.value = ''; await loadComments(activePost.id); }
  } catch {}
});

// ── New Post Modal ─────────────────────────────────────────
const newPostOverlay = document.getElementById('newPostOverlay');
const uploadZone = document.getElementById('uploadZone');
const postImageInput = document.getElementById('postImageInput');
const uploadPreview  = document.getElementById('uploadPreview');
let postFile = null;

function openNewPost() {
  if (!currentUser) return openAuth();
  newPostOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

document.getElementById('newPostClose').addEventListener('click', () => {
  newPostOverlay.classList.remove('open'); document.body.style.overflow = '';
});
newPostOverlay.addEventListener('click', e => {
  if (e.target === newPostOverlay) { newPostOverlay.classList.remove('open'); document.body.style.overflow = ''; }
});
document.getElementById('newPostBtnNav').addEventListener('click', openNewPost);

uploadZone.addEventListener('click', () => postImageInput.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.style.borderColor = 'var(--c-accent)'; });
uploadZone.addEventListener('dragleave', () => { uploadZone.style.borderColor = ''; });
uploadZone.addEventListener('drop', e => {
  e.preventDefault(); uploadZone.style.borderColor = '';
  const file = e.dataTransfer.files[0];
  if (file) setPostFile(file);
});
postImageInput.addEventListener('change', e => { if (e.target.files[0]) setPostFile(e.target.files[0]); });

function setPostFile(file) {
  postFile = file;
  uploadPreview.src = URL.createObjectURL(file);
  uploadPreview.style.display = 'block';
  uploadZone.style.display = 'none';
}

document.getElementById('submitPostBtn').addEventListener('click', async () => {
  const err = document.getElementById('newPostError');
  if (!postFile) { err.textContent = 'Please select an image.'; return; }
  err.textContent = '';
  const fd = new FormData();
  fd.append('image', postFile);
  fd.append('caption',   document.getElementById('postCaption').value.trim());
  fd.append('road_name', document.getElementById('postRoadName').value.trim());
  fd.append('region',    document.getElementById('postRegion').value);
  const btn = document.getElementById('submitPostBtn');
  btn.disabled = true; btn.textContent = 'Sharing…';
  try {
    const res = await fetch(`${API}/api/posts`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const data = await res.json();
    if (!res.ok) { err.textContent = data.error; return; }
    newPostOverlay.classList.remove('open'); document.body.style.overflow = '';
    // Reset
    postFile = null; uploadPreview.style.display = 'none'; uploadZone.style.display = '';
    document.getElementById('postCaption').value = '';
    document.getElementById('postRoadName').value = '';
    document.getElementById('postRegion').value = '';
    await loadFeed(true);
  } catch { err.textContent = 'Upload failed. Try again.'; }
  finally { btn.disabled = false; btn.textContent = 'Share Road'; }
});

// ── Auth Modal ─────────────────────────────────────────────
const authOverlay = document.getElementById('authOverlay');
let authMode = 'login';

function openAuth() {
  authOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

document.getElementById('authClose').addEventListener('click', () => {
  authOverlay.classList.remove('open'); document.body.style.overflow = '';
});
authOverlay.addEventListener('click', e => {
  if (e.target === authOverlay) { authOverlay.classList.remove('open'); document.body.style.overflow = ''; }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    authOverlay.classList.remove('open');
    newPostOverlay.classList.remove('open');
    postOverlay.classList.remove('open');
    newStoryOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }
});

document.getElementById('authSwitchBtn').addEventListener('click', () => {
  authMode = authMode === 'login' ? 'register' : 'login';
  document.getElementById('loginForm').style.display  = authMode === 'login' ? '' : 'none';
  document.getElementById('registerForm').style.display = authMode === 'register' ? '' : 'none';
  document.getElementById('authTitle').textContent = authMode === 'login' ? 'Sign In' : 'Create Account';
  document.getElementById('authSwitchText').textContent = authMode === 'login' ? 'Don\'t have an account?' : 'Already have one?';
  document.getElementById('authSwitchBtn').textContent  = authMode === 'login' ? 'Sign Up' : 'Sign In';
});

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  let valid = true;
  document.getElementById('loginEmailError').textContent = '';
  document.getElementById('loginPasswordError').textContent = '';
  document.getElementById('loginError').textContent = '';
  if (!email) { document.getElementById('loginEmailError').textContent = 'Required.'; valid = false; }
  if (!password) { document.getElementById('loginPasswordError').textContent = 'Required.'; valid = false; }
  if (!valid) return;
  try {
    const res = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) { document.getElementById('loginError').textContent = data.error; return; }
    token = data.token; currentUser = data.user;
    localStorage.setItem('atlas-token', token);
    authOverlay.classList.remove('open'); document.body.style.overflow = '';
    renderNav(currentUser);
  } catch { document.getElementById('loginError').textContent = 'Network error. Try again.'; }
});

document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  let valid = true;
  ['regNameError','regEmailError','regPasswordError','regError'].forEach(id => document.getElementById(id).textContent = '');
  if (!name) { document.getElementById('regNameError').textContent = 'Required.'; valid = false; }
  if (!email) { document.getElementById('regEmailError').textContent = 'Required.'; valid = false; }
  if (!password || password.length < 6) { document.getElementById('regPasswordError').textContent = 'Min 6 characters.'; valid = false; }
  if (!valid) return;
  try {
    const res = await fetch(`${API}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
    const data = await res.json();
    if (!res.ok) { document.getElementById('regError').textContent = data.error; return; }
    token = data.token; currentUser = data.user;
    localStorage.setItem('atlas-token', token);
    authOverlay.classList.remove('open'); document.body.style.overflow = '';
    renderNav(currentUser);
  } catch { document.getElementById('regError').textContent = 'Network error. Try again.'; }
});

// ── Utils ──────────────────────────────────────────────────
function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts.includes('T') ? ts : ts + 'Z');
  const diff = (Date.now() - d) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

// ── Init ───────────────────────────────────────────────────
(async () => {
  await loadMe();
  await Promise.all([loadFeed(true), loadStories()]);
})();
