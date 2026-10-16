/* ============================================================
   One Culture — Community JS (Instagram-style feed)
   ============================================================ */

const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001' : '';

// Handle Apple Sign In redirect token
(function() {
  const p = new URLSearchParams(location.search);
  const t = p.get('apple_token');
  if (t) { localStorage.setItem('culture-token', t); history.replaceState(null, '', 'community.html'); }
})();
let token = localStorage.getItem('culture-token');
if (!token) location.replace('index.html');
let currentUser = null;
let posts = [];
let page = 1;
let totalPages = 1;
let activePost = null;
let allStories = [];
let storyIndex = 0;
let storyTimer = null;
let feedMode = 'forYou'; // 'forYou' | 'following'

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
    if (!res.ok) { token = null; localStorage.removeItem('culture-token'); location.replace('index.html'); return; }
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
      <a href="profile.html?id=${user.id}" class="nav-user-btn"><div class="avatar avatar-sm">${init}</div></a>
      <button class="nav-signout-btn" id="navSignOut">Sign Out</button>`;
    document.getElementById('navSignOut').addEventListener('click', () => {
      localStorage.removeItem('culture-token'); token = null; currentUser = null; location.replace('index.html');
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
      <span>${(s.user_name||'').split(' ')[0] || 'Driver'}</span>
      <span class="story-time-left">${storyTimeLeft(s.created_at)}</span>`;
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
  const userHdr = document.getElementById('storyUserHeader');
  if (userHdr) {
    userHdr.innerHTML = `
      <div class="story-user-avatar">${initials}</div>
      <div>
        <div class="story-user-name">${esc(s.user_name||'Driver')}</div>
        <div class="story-user-time">${storyTimeLeft(s.created_at)}</div>
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

function openNewStory() {
  if (!currentUser) return openAuth();
  newStoryOverlay.classList.add('open');
}
window.openNewStory = openNewStory;

document.getElementById('addStoryBtn').addEventListener('click', openNewStory);
document.getElementById('newStoryBtn').addEventListener('click', openNewStory);
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

// ── Feed tabs ──────────────────────────────────────────────
function renderFeedTabs() {
  const el = document.getElementById('feedTabs');
  if (!el) return;
  el.querySelectorAll('.feed-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.mode === feedMode);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.getElementById('feedTabs');
  if (tabs) {
    tabs.addEventListener('click', e => {
      const tab = e.target.closest('.feed-tab');
      if (!tab) return;
      const mode = tab.dataset.mode;
      if (mode === 'following' && !currentUser) return openAuth();
      feedMode = mode;
      renderFeedTabs();
      loadFeed(true);
    });
  }

  // Swipe left/right on the feed to switch tabs
  const feedMain = document.getElementById('feedMain');
  if (feedMain) {
    let swipeStartX = 0;
    feedMain.addEventListener('touchstart', e => { swipeStartX = e.touches[0].clientX; }, { passive: true });
    feedMain.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - swipeStartX;
      if (Math.abs(dx) < 60) return;
      const modes = ['forYou', 'following'];
      const idx = modes.indexOf(feedMode);
      const next = dx < 0 ? modes[idx + 1] : modes[idx - 1];
      if (!next) return;
      if (next === 'following' && !currentUser) return openAuth();
      feedMode = next;
      renderFeedTabs();
      loadFeed(true);
    }, { passive: true });
  }
});

// ── Feed ───────────────────────────────────────────────────
async function loadFeed(reset = false) {
  if (reset) { page = 1; posts = []; document.getElementById('feedList').innerHTML = ''; }
  document.getElementById('feedLoading').style.display = 'flex';
  try {
    const feedParam = feedMode === 'following' ? '&feed=following' : '';
    const res = await fetch(`${API}/api/posts?page=${page}&limit=10${feedParam}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
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

function isVideoUrl(url) {
  return /\.(mp4|webm|mov|m4v|avi)(\?|$)/i.test(url);
}

function buildCarousel(urls) {
  if (!urls || urls.length <= 1) return '';
  const slides = urls.map(u => {
    const src = u.startsWith('http') ? u : `${API}${u}`;
    const isV = isVideoUrl(src);
    return `<div class="carousel-slide">${isV
      ? `<video src="${src}" muted loop playsinline preload="metadata"></video>`
      : `<img src="${src}" loading="lazy" />`}</div>`;
  }).join('');
  const dots = urls.map((_, i) => `<div class="carousel-dot${i===0?' active':''}"></div>`).join('');
  return `<div class="carousel-track" data-count="${urls.length}">${slides}</div>
          <div class="carousel-dots">${dots}</div>
          <div class="carousel-count">1 / ${urls.length}</div>`;
}

function initCarousel(wrap) {
  const track = wrap.querySelector('.carousel-track');
  if (!track) return;
  const dots = wrap.querySelectorAll('.carousel-dot');
  const countEl = wrap.querySelector('.carousel-count');
  const total = parseInt(track.dataset.count);
  track.addEventListener('scroll', () => {
    const idx = Math.round(track.scrollLeft / track.clientWidth);
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    if (countEl) countEl.textContent = `${idx + 1} / ${total}`;
  }, { passive: true });
}

function buildPostCard(p) {
  const initials = (p.user_name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const urls = (p.image_urls?.length ? p.image_urls : (p.image_url ? [p.image_url] : [])).map(u => u.startsWith('http') ? u : `${API}${u}`);
  const mediaSrc = urls[0] || '';
  const isVideo  = isVideoUrl(mediaSrc);
  const multi    = urls.length > 1;
  const timeStr  = formatTime(p.created_at);

  const card = document.createElement('article');
  card.className = 'post-card';
  card._userId = String(p.user_id);
  card.innerHTML = `
    <div class="post-card-header">
      <a href="profile.html?id=${p.user_id}" class="post-avatar" style="text-decoration:none;color:inherit;">${initials}</a>
      <div class="post-card-meta">
        <a href="profile.html?id=${p.user_id}" class="post-card-username" style="text-decoration:none;color:inherit;">${esc(p.user_name||'Driver')}</a>
        <div class="post-card-road">${esc(p.road_name||p.region||'')}</div>
      </div>
      <button class="post-card-more" aria-label="More options">
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
      </button>
    </div>
    <div class="post-card-img-wrap">
      ${multi
        ? buildCarousel(urls)
        : isVideo
          ? `<video src="${mediaSrc}" muted loop playsinline preload="metadata" class="post-card-video"></video>`
          : `<img src="${mediaSrc}" alt="${esc(p.road_name||'Road photo')}" loading="lazy" />`}
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
      <button class="post-action-btn save-btn${p.saved?' saved':''}" data-id="${p.id}" aria-label="Save" style="margin-left:auto">
        <svg viewBox="0 0 24 24" fill="${p.saved?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
      </button>
    </div>
    <div class="post-card-likes">${p.likes} like${p.likes===1?'':'s'}</div>
    ${p.caption ? `<div class="post-card-caption"><strong>${esc(p.user_name||'')}</strong> ${esc(p.caption)}</div>` : ''}
    ${p.mod_title ? `<div class="post-mod-card">
      <div class="post-mod-info">
        <span class="post-mod-title">${esc(p.mod_title)}</span>
        ${p.mod_price ? `<span class="post-mod-price">${esc(p.mod_price)}</span>` : ''}
      </div>
      ${p.mod_url ? `<a href="${esc(p.mod_url)}" target="_blank" rel="noopener noreferrer" class="post-mod-link">View</a>` : ''}
    </div>` : ''}
    <div class="post-card-time">${timeStr}</div>
  `;

  card.querySelector('.like-btn').addEventListener('click', e => toggleLike(p, e.currentTarget, card));
  card.querySelector('.comment-btn').addEventListener('click', () => openPostModal(p));
  card.querySelector('.share-btn').addEventListener('click', () => sharePost(p.id));
  card.querySelector('.save-btn').addEventListener('click', e => toggleSave(p, e.currentTarget));

  initCarousel(card.querySelector('.post-card-img-wrap'));

  const mediaEl = card.querySelector('.post-card-img-wrap img, .post-card-img-wrap video');
  if (mediaEl) {
    mediaEl.addEventListener('dblclick', () => {
      const btn = card.querySelector('.like-btn');
      if (!p.liked) toggleLike(p, btn, card);
    });
    if (mediaEl.tagName === 'VIDEO') {
      mediaEl.addEventListener('mouseenter', () => mediaEl.play().catch(() => {}));
      mediaEl.addEventListener('mouseleave', () => { mediaEl.pause(); mediaEl.currentTime = 0; });
    }
  }

  card.querySelector('.post-card-more').addEventListener('click', () => openPostMenu(p, card));
  return card;
}

async function toggleSave(post, btn) {
  if (!currentUser) return openAuth();
  try {
    const res = await fetch(`${API}/api/posts/${post.id}/save`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    post.saved = data.saved;
    btn.classList.toggle('saved', data.saved);
    btn.querySelector('svg').setAttribute('fill', data.saved ? 'currentColor' : 'none');
  } catch {}
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
  const mediaSrc = post.image_url.startsWith('http') ? post.image_url : `${API}${post.image_url}`;
  const modalImg   = document.getElementById('postModalImg');
  const modalVideo = document.getElementById('postModalVideo');
  if (isVideoUrl(mediaSrc)) {
    modalImg.style.display = 'none'; modalImg.src = '';
    modalVideo.src = mediaSrc; modalVideo.style.display = 'block';
  } else {
    modalVideo.style.display = 'none'; modalVideo.src = '';
    modalImg.src = mediaSrc; modalImg.style.display = 'block';
  }
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

function closePostModal() {
  postOverlay.classList.remove('open');
  document.body.style.overflow = '';
  const v = document.getElementById('postModalVideo');
  if (v) { v.pause(); v.src = ''; }
}
document.getElementById('postModalClose').addEventListener('click', closePostModal);
postOverlay.addEventListener('click', e => { if (e.target === postOverlay) closePostModal(); });

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
let postFiles = [];

function openNewPost() {
  if (!currentUser) return openAuth();
  newPostOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}
window.openNewPost = openNewPost;

document.getElementById('newPostClose').addEventListener('click', () => {
  newPostOverlay.classList.remove('open'); document.body.style.overflow = '';
});
newPostOverlay.addEventListener('click', e => {
  if (e.target === newPostOverlay) { newPostOverlay.classList.remove('open'); document.body.style.overflow = ''; }
});
// create-sheet.js intercepts .bnav-post in capture phase; this is the fallback
const _newPostBtnNav = document.getElementById('newPostBtnNav');
if (_newPostBtnNav) _newPostBtnNav.addEventListener('click', () => {
  if (typeof window.openCreateSheet === 'function') window.openCreateSheet();
  else openNewPost();
});

postImageInput.setAttribute('multiple', 'true');

uploadZone.addEventListener('click', () => postImageInput.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.style.borderColor = 'var(--c-accent)'; });
uploadZone.addEventListener('dragleave', () => { uploadZone.style.borderColor = ''; });
uploadZone.addEventListener('drop', e => {
  e.preventDefault(); uploadZone.style.borderColor = '';
  addPostFiles(Array.from(e.dataTransfer.files));
});
postImageInput.addEventListener('change', e => {
  addPostFiles(Array.from(e.target.files));
  e.target.value = '';
});

function addPostFiles(files) {
  files.forEach(f => { if (postFiles.length < 10) postFiles.push(f); });
  renderPostThumbs();
}

function renderPostThumbs() {
  uploadZone.style.display = 'none';
  uploadPreview.style.display = 'none';
  const videoPreview = document.getElementById('uploadVideoPreview');
  if (videoPreview) videoPreview.style.display = 'none';

  let thumbsEl = document.getElementById('postThumbsGrid');
  if (!thumbsEl) {
    thumbsEl = document.createElement('div');
    thumbsEl.id = 'postThumbsGrid';
    thumbsEl.className = 'upload-thumbs';
    uploadZone.parentNode.insertBefore(thumbsEl, uploadZone.nextSibling);
  }
  thumbsEl.innerHTML = '';
  postFiles.forEach((f, i) => {
    const div = document.createElement('div');
    div.className = 'upload-thumb';
    const img = document.createElement('img');
    img.src = URL.createObjectURL(f);
    const rm = document.createElement('button');
    rm.className = 'upload-thumb-rm';
    rm.innerHTML = '×';
    rm.addEventListener('click', () => { postFiles.splice(i, 1); renderPostThumbs(); });
    div.appendChild(img); div.appendChild(rm);
    thumbsEl.appendChild(div);
  });
  if (postFiles.length < 10) {
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'upload-add-more';
    add.innerHTML = '+';
    add.addEventListener('click', () => postImageInput.click());
    thumbsEl.appendChild(add);
  }
  thumbsEl.style.display = postFiles.length ? 'grid' : 'none';
  if (!postFiles.length) { uploadZone.style.display = ''; thumbsEl.style.display = 'none'; }
}

document.getElementById('submitPostBtn').addEventListener('click', async () => {
  const err = document.getElementById('newPostError');
  if (!postFiles.length) { err.textContent = 'Please select a photo or video.'; return; }
  err.textContent = '';
  const fd = new FormData();
  postFiles.forEach(f => fd.append('images', f));
  fd.append('caption',   document.getElementById('postCaption').value.trim());
  fd.append('road_name', document.getElementById('postRoadName').value.trim());
  fd.append('region',    document.getElementById('postRegion').value);
  fd.append('mod_category', (document.getElementById('postModCategory')?.value||'').trim());
  fd.append('mod_title',    (document.getElementById('postModTitle')?.value||'').trim());
  fd.append('mod_price',    (document.getElementById('postModPrice')?.value||'').trim());
  fd.append('mod_url',      (document.getElementById('postModUrl')?.value||'').trim());
  const btn = document.getElementById('submitPostBtn');
  btn.disabled = true; btn.textContent = 'Sharing…';
  try {
    const res = await fetch(`${API}/api/posts`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const data = await res.json();
    if (!res.ok) { err.textContent = data.error; return; }
    newPostOverlay.classList.remove('open'); document.body.style.overflow = '';
    // Reset
    postFiles = [];
    const thumbsGrid = document.getElementById('postThumbsGrid');
    if (thumbsGrid) { thumbsGrid.innerHTML = ''; thumbsGrid.style.display = 'none'; }
    uploadPreview.style.display = 'none'; uploadZone.style.display = '';
    document.getElementById('postCaption').value = '';
    document.getElementById('postRoadName').value = '';
    document.getElementById('postRegion').value = '';
    if (document.getElementById('postModTitle')) document.getElementById('postModTitle').value = '';
    if (document.getElementById('postModPrice')) document.getElementById('postModPrice').value = '';
    if (document.getElementById('postModUrl'))   document.getElementById('postModUrl').value = '';
    const md = document.getElementById('modDetails');
    if (md) md.removeAttribute('open');
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
    localStorage.setItem('culture-token', token);
    authOverlay.classList.remove('open'); document.body.style.overflow = '';
    renderNav(currentUser);
    document.getElementById('notifBtn').style.display = '';
    loadNotifications();
    if (!notifPollTimer) notifPollTimer = setInterval(loadNotifications, 30000);
    loadFeed(true);
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
    localStorage.setItem('culture-token', token);
    authOverlay.classList.remove('open'); document.body.style.overflow = '';
    renderNav(currentUser);
    document.getElementById('notifBtn').style.display = '';
    loadNotifications();
    notifPollTimer = setInterval(loadNotifications, 30000);
    loadFeed(true);
    if (!localStorage.getItem('culture-onboarded')) showOnboarding();
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

function storyTimeLeft(ts) {
  if (!ts) return '';
  const d = new Date(ts.includes('T') ? ts : ts + 'Z');
  const expiresAt = d.getTime() + 24 * 60 * 60 * 1000;
  const msLeft = expiresAt - Date.now();
  if (msLeft <= 0) return 'Expired';
  const hLeft = Math.floor(msLeft / 3600000);
  const mLeft = Math.floor((msLeft % 3600000) / 60000);
  if (hLeft === 0) return `${mLeft}m left`;
  if (mLeft === 0) return `${hLeft}h left`;
  return `${hLeft}h ${mLeft}m left`;
}

// ── Notifications ──────────────────────────────────────────
const notifOverlay = document.getElementById('notifOverlay');
let notifPollTimer = null;

document.getElementById('notifBtn').addEventListener('click', () => {
  notifOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  renderNotifList();
  markNotifsRead();
});
document.getElementById('notifClose').addEventListener('click', () => {
  notifOverlay.classList.remove('open'); document.body.style.overflow = '';
});
notifOverlay.addEventListener('click', e => {
  if (e.target === notifOverlay) { notifOverlay.classList.remove('open'); document.body.style.overflow = ''; }
});

async function loadNotifications() {
  if (!currentUser) return;
  try {
    const res = await fetch(`${API}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } });
    const { unread } = await res.json();
    const badge = document.getElementById('notifBadge');
    if (unread > 0) { badge.textContent = unread > 9 ? '9+' : unread; badge.style.display = ''; }
    else badge.style.display = 'none';
  } catch {}
}

async function renderNotifList() {
  const list = document.getElementById('notifList');
  list.innerHTML = '<div class="feed-loading"><div class="spinner"></div></div>';
  try {
    const res = await fetch(`${API}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } });
    const { notifications } = await res.json();
    if (!notifications?.length) {
      list.innerHTML = '<p class="notif-empty">No notifications yet.</p>'; return;
    }
    list.innerHTML = notifications.map(n => `
      <div class="notif-item${n.read ? '' : ' notif-unread'}" data-post="${n.post_id || ''}">
        <div class="notif-avatar">${(n.actor_name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}</div>
        <div class="notif-body">
          <strong>${esc(n.actor_name||'Someone')}</strong>
          ${n.type === 'like' ? ' liked your post.' : ' commented on your post.'}
          <div class="notif-time">${formatTime(n.created_at)}</div>
        </div>
        ${n.post_image ? `<img class="notif-thumb" src="${n.post_image.startsWith('http') ? n.post_image : API + n.post_image}" alt="" />` : ''}
      </div>`).join('');
    list.querySelectorAll('.notif-item[data-post]').forEach(el => {
      const postId = parseInt(el.dataset.post);
      if (!postId) return;
      el.style.cursor = 'pointer';
      el.addEventListener('click', async () => {
        notifOverlay.classList.remove('open'); document.body.style.overflow = '';
        await openPostById(postId);
      });
    });
  } catch { list.innerHTML = '<p class="notif-empty">Failed to load.</p>'; }
}

async function markNotifsRead() {
  try {
    await fetch(`${API}/api/notifications/read`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const badge = document.getElementById('notifBadge');
    badge.style.display = 'none';
  } catch {}
}

async function openPostById(postId) {
  try {
    const res = await fetch(`${API}/api/posts/${postId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) return;
    const { post } = await res.json();
    await openPostModal(post);
  } catch {}
}

// ── Post deep-link (?post=:id in URL) ──────────────────────
(async function handlePostDeepLink() {
  const params = new URLSearchParams(location.search);
  const postId = parseInt(params.get('post'));
  if (!postId) return;
  history.replaceState({}, '', location.pathname);
  await openPostById(postId);
})();

// ── Delete own post ────────────────────────────────────────
function deletePost(postId, cardEl) {
  showConfirm('Delete this post?', 'This cannot be undone.', async () => {
    try {
      const res = await fetch(`${API}/api/posts/${postId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        cardEl.remove();
        posts = posts.filter(p => p.id !== postId);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Could not delete post.');
      }
    } catch { showToast('Could not delete post.'); }
  });
}

function showConfirm(title, body, onConfirm, label = 'Delete') {
  const sheet = document.createElement('div');
  sheet.className = 'confirm-sheet';
  sheet.innerHTML = `
    <div class="confirm-sheet-box">
      <p class="confirm-sheet-title">${title}</p>
      ${body ? `<p class="confirm-sheet-body">${body}</p>` : ''}
      <button class="confirm-sheet-del">${label}</button>
      <button class="confirm-sheet-cancel">Cancel</button>
    </div>`;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.classList.add('confirm-sheet-open'));
  const close = () => { sheet.classList.remove('confirm-sheet-open'); setTimeout(() => sheet.remove(), 250); };
  sheet.querySelector('.confirm-sheet-del').addEventListener('click', () => { close(); onConfirm(); });
  sheet.querySelector('.confirm-sheet-cancel').addEventListener('click', close);
  sheet.addEventListener('click', e => { if (e.target === sheet) close(); });
}

// ── Report post ────────────────────────────────────────────
function showActionSheet(title, items) {
  const sheet = document.createElement('div');
  sheet.className = 'confirm-sheet';
  sheet.innerHTML = `<div class="confirm-sheet-box">
    ${title ? `<p class="confirm-sheet-title">${esc(title)}</p>` : ''}
    ${items.map((it, i) => `<button class="action-sheet-item${it.danger ? ' danger' : ''}" data-i="${i}">${esc(it.label)}</button>`).join('')}
    <button class="confirm-sheet-cancel">Cancel</button>
  </div>`;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.classList.add('confirm-sheet-open'));
  const close = () => { sheet.classList.remove('confirm-sheet-open'); setTimeout(() => sheet.remove(), 250); };
  sheet.querySelectorAll('.action-sheet-item').forEach(btn =>
    btn.addEventListener('click', () => { close(); items[+btn.dataset.i].fn(); }));
  sheet.querySelector('.confirm-sheet-cancel').addEventListener('click', close);
  sheet.addEventListener('click', e => { if (e.target === sheet) close(); });
}

function openPostMenu(p, card) {
  const isOwn = currentUser && String(p.user_id) === String(currentUser.id);
  const items = [
    { label: 'Share', fn: () => sharePost(p.id) },
    { label: 'Copy link', fn: () => {
      const url = `${location.origin}/community.html?post=${p.id}`;
      navigator.clipboard?.writeText(url).then(() => showToast('Link copied!')).catch(() => showToast(url));
    } },
  ];
  if (currentUser) {
    items.push({ label: p.saved ? 'Unsave' : 'Save', fn: () => toggleSave(p, card.querySelector('.save-btn')) });
    if (currentUser.is_admin) items.push({ label: p.is_pinned ? 'Unpin post' : 'Pin post', fn: () => togglePin(p) });
    if (isOwn || currentUser.is_admin) items.push({ label: 'Delete post', danger: true, fn: () => deletePost(p.id, card) });
    if (!isOwn) {
      items.push({ label: 'Report post', danger: true, fn: () => reportPost(p.id) });
      items.push({ label: `Block ${p.user_name || 'user'}`, danger: true, fn: () => blockPoster(p) });
    }
  } else {
    items.push({ label: 'Report post', danger: true, fn: openAuth });
  }
  showActionSheet('', items);
}

async function togglePin(p) {
  const action = p.is_pinned ? 'unpin' : 'pin';
  try {
    const res = await fetch(`${API}/api/admin/posts/${p.id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error();
    p.is_pinned = !p.is_pinned;
    showToast(p.is_pinned ? 'Post pinned' : 'Post unpinned');
  } catch { showToast('Could not update pin.'); }
}

function reportPost(postId) {
  if (!currentUser) return openAuth();
  const reasons = ['Spam or scam', 'Inappropriate or offensive', 'Harassment or hate', 'Dangerous driving', 'Something else'];
  showActionSheet('Why are you reporting this post?', reasons.map(r => ({
    label: r, danger: false,
    fn: async () => {
      try {
        const res = await fetch(`${API}/api/report`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_type: 'post', target_id: postId, reason: r })
        });
        showToast(res.ok ? 'Thanks — we\'ll review this post.' : 'Could not send report.');
      } catch { showToast('Could not send report.'); }
    }
  })));
}

function blockPoster(p) {
  showConfirm(`Block ${p.user_name || 'this user'}?`, 'You won\'t see their posts and they can\'t message you.', async () => {
    try {
      const res = await fetch(`${API}/api/block/${p.user_id}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      document.querySelectorAll('.post-card').forEach(c => { if (c._userId === String(p.user_id)) c.remove(); });
      posts = posts.filter(x => String(x.user_id) !== String(p.user_id));
      showToast('User blocked');
    } catch { showToast('Could not block user.'); }
  }, 'Block');
}

// ── Share post ─────────────────────────────────────────────
function sharePost(postId) {
  if (!currentUser) {
    const url = `${location.origin}/community.html?post=${postId}`;
    if (navigator.share) navigator.share({ title: 'One Culture', url }).catch(() => {});
    else navigator.clipboard?.writeText(url).then(() => showToast('Link copied!')).catch(() => {});
    return;
  }

  const postUrl = `${location.origin}/community.html?post=${postId}`;
  const sheet = document.createElement('div');
  sheet.className = 'share-sheet';
  sheet.innerHTML = `
    <div class="share-sheet-box">
      <div class="share-sheet-header">
        <span class="share-sheet-title">Share Post</span>
        <button class="share-sheet-close" aria-label="Close">✕</button>
      </div>
      <input class="share-sheet-input" placeholder="Search users…" autocomplete="off" />
      <div class="share-sheet-results"></div>
      <div class="share-sheet-sep"></div>
      <button class="share-sheet-ext">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        Share externally…
      </button>
    </div>`;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.classList.add('share-sheet-open'));

  const close = () => {
    sheet.classList.remove('share-sheet-open');
    setTimeout(() => sheet.remove(), 260);
  };
  sheet.querySelector('.share-sheet-close').addEventListener('click', close);
  sheet.addEventListener('click', e => { if (e.target === sheet) close(); });

  const input = sheet.querySelector('.share-sheet-input');
  const results = sheet.querySelector('.share-sheet-results');
  let timer;

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (!q) { results.innerHTML = ''; return; }
    timer = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const { users = [] } = await r.json();
        if (!users.length) { results.innerHTML = '<p class="share-no-results">No users found</p>'; return; }
        results.innerHTML = users.slice(0, 8).map(u => {
          const initials = u.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
          return `<div class="share-user-row" data-id="${u.id}" data-name="${esc(u.name)}">
            <div class="share-user-av">${initials}</div>
            <span class="share-user-name">${esc(u.name)}</span>
            <span class="share-user-send">Send</span>
          </div>`;
        }).join('');
        results.querySelectorAll('.share-user-row').forEach(row => {
          row.addEventListener('click', () => sendPostToUser(row.dataset.id, row.dataset.name, postId, close));
        });
      } catch {}
    }, 280);
  });

  sheet.querySelector('.share-sheet-ext').addEventListener('click', () => {
    close();
    if (navigator.share) navigator.share({ title: 'One Culture', url: postUrl }).catch(() => {});
    else navigator.clipboard?.writeText(postUrl).then(() => showToast('Link copied!')).catch(() => {});
  });

  setTimeout(() => input.focus(), 280);
}

async function sendPostToUser(userId, userName, postId, closeSheet) {
  const post = posts.find(p => String(p.id) === String(postId));
  const messageBody = post ? JSON.stringify({
    __type:    'post_share',
    post_id:   post.id,
    image_url: (post.image_urls && post.image_urls[0]) || post.image_url || '',
    caption:   post.caption || '',
    user_id:   post.user_id,
    user_name: post.user_name || 'Driver',
    road_name: post.road_name || ''
  }) : `${location.origin}/community.html?post=${postId}`;

  try {
    const convRes = await fetch(`${API}/api/conversations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    const { conversation_id } = await convRes.json();
    await fetch(`${API}/api/conversations/${conversation_id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: messageBody })
    });
    closeSheet();
    showToast(`Sent to ${userName}!`);
  } catch { showToast('Could not send.'); }
}

function showToast(msg) {
  let t = document.getElementById('appToast');
  if (!t) { t = document.createElement('div'); t.id = 'appToast'; t.className = 'app-toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ── Onboarding ─────────────────────────────────────────────
function showOnboarding() {
  const el = document.getElementById('onboardingOverlay');
  if (!el) return;
  el.style.display = 'flex'; document.body.style.overflow = 'hidden';
  claimReferral();
  renderOnboardingStep(0);
}

async function claimReferral() {
  const ref = localStorage.getItem('culture-ref');
  if (!ref || !token) return;
  try {
    await fetch(`${API}/api/referral`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref })
    });
  } catch {}
  localStorage.removeItem('culture-ref');
}

function finishOnboarding(then) {
  localStorage.setItem('culture-onboarded', '1');
  const el = document.getElementById('onboardingOverlay');
  if (el) { el.style.display = 'none'; document.body.style.overflow = ''; }
  loadFeed(true);
  if (then) then();
}

function renderOnboardingStep(n) {
  const card = document.getElementById('onboardingCard');
  if (!card) return;
  const dots = `<div class="ob-dots">${[0, 1, 2].map(i => `<span class="ob-dot${i === n ? ' active' : ''}"></span>`).join('')}</div>`;
  const next = () => renderOnboardingStep(n + 1);

  if (n === 0) {
    card.innerHTML = `${dots}
      <h2>What do you drive?</h2>
      <p>Add your car to your garage so people can see your build.</p>
      <div class="ob-car-row">
        <input id="obYear" type="number" inputmode="numeric" placeholder="Year" min="1900" max="2100" />
        <input id="obMake" type="text" placeholder="Make (e.g. Porsche)" maxlength="40" />
      </div>
      <input id="obModel" type="text" placeholder="Model (e.g. 911 GT3)" maxlength="60" />
      <span class="field-error" id="obErr"></span>
      <button class="btn btn-primary btn-full" id="obNext">Next</button>
      <button class="ob-skip" id="obSkip">Skip for now</button>`;
    document.getElementById('obSkip').addEventListener('click', next);
    document.getElementById('obNext').addEventListener('click', async () => {
      const year = document.getElementById('obYear').value.trim();
      const make = document.getElementById('obMake').value.trim();
      const model = document.getElementById('obModel').value.trim();
      const err = document.getElementById('obErr');
      if (!make && !model) return next();
      if (!make || !model) { err.textContent = 'Add both make and model, or skip.'; return; }
      try {
        await fetch(`${API}/api/cars`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ year, make, model })
        });
      } catch {}
      next();
    });
    return;
  }

  if (n === 1) {
    card.innerHTML = `${dots}
      <h2>Follow some drivers</h2>
      <p>Their posts and roads will fill your feed.</p>
      <div class="ob-list" id="obList"><div class="ob-empty">Finding drivers…</div></div>
      <button class="btn btn-primary btn-full" id="obNext">Next</button>
      <button class="ob-skip" id="obSkip">Skip for now</button>`;
    document.getElementById('obSkip').addEventListener('click', next);
    document.getElementById('obNext').addEventListener('click', next);
    loadOnboardingUsers();
    return;
  }

  card.innerHTML = `${dots}
    <h2>You're in.</h2>
    <p>Post your first photo and bring your friends along.</p>
    <button class="btn btn-primary btn-full" id="obPost">Post your first photo</button>
    <button class="btn btn-outline btn-full" id="obInvite">Invite friends</button>
    <button class="ob-skip" id="obSkip">Go to my feed</button>`;
  document.getElementById('obPost').addEventListener('click', () => finishOnboarding(() => openNewPost()));
  document.getElementById('obInvite').addEventListener('click', () => shareInvite(currentUser));
  document.getElementById('obSkip').addEventListener('click', () => finishOnboarding());
}

async function loadOnboardingUsers() {
  const list = document.getElementById('obList');
  try {
    const res = await fetch(`${API}/api/users/suggested?limit=12`, { headers: { Authorization: `Bearer ${token}` } });
    const { users = [] } = await res.json();
    if (!users.length) {
      list.innerHTML = `<div class="ob-empty">You're one of the first drivers here. Invite friends on the next step to get things going.</div>`;
      return;
    }
    list.innerHTML = users.map(u => {
      const init = (u.name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
      const av = u.avatar ? `<img src="${esc(u.avatar)}" alt="" />` : init;
      return `<div class="ob-user" data-id="${u.id}">
        <div class="ob-user-av">${av}</div>
        <div class="ob-user-info"><strong>${esc(u.name || 'Driver')}</strong><span>${esc((u.bio || '').slice(0, 48))}</span></div>
        <button class="ob-follow" data-following="0">Follow</button>
      </div>`;
    }).join('');
    list.querySelectorAll('.ob-user').forEach(row => {
      const btn = row.querySelector('.ob-follow');
      btn.addEventListener('click', async () => {
        const following = btn.dataset.following === '1';
        btn.disabled = true;
        try {
          const r = await fetch(`${API}/api/follow/${row.dataset.id}`, {
            method: following ? 'DELETE' : 'POST',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (r.ok) {
            btn.dataset.following = following ? '0' : '1';
            btn.textContent = following ? 'Follow' : 'Following';
            btn.classList.toggle('on', !following);
          }
        } catch {}
        btn.disabled = false;
      });
    });
  } catch {
    list.innerHTML = `<div class="ob-empty">Couldn't load suggestions. You can find people later in Search.</div>`;
  }
}

// ── Init ───────────────────────────────────────────────────
(async () => {
  await loadMe();
  const _sp = new URLSearchParams(location.search);
  const _cp = _sp.get('create');
  if (_cp === 'post') openNewPost();
  else if (_cp === 'story') openNewStory();
  await Promise.all([loadFeed(true), loadStories()]);
  if (currentUser) {
    document.getElementById('notifBtn').style.display = '';
    loadNotifications();
    notifPollTimer = setInterval(loadNotifications, 30000);
    // Show onboarding for brand-new users
    const _recent = currentUser.created_at && (Date.now() - new Date(currentUser.created_at).getTime()) < 15 * 60 * 1000;
    if (_sp.get('onboarding') === '1' || ((_sp.get('new') === '1' || _recent) && !localStorage.getItem('culture-onboarded'))) {
      showOnboarding();
    }
    // Request push permission after a short delay
    setTimeout(requestPushPermission, 4000);
  }
})();

async function requestPushPermission() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  // Only prompt once; but always re-send subscription if already granted
  const alreadyAsked = localStorage.getItem('culture-push-asked');
  if (!alreadyAsked) localStorage.setItem('culture-push-asked', '1');
  try {
    const r = await fetch(`${API}/api/push/vapid-key`);
    const { publicKey } = await r.json();
    if (!publicKey) return;
    if (alreadyAsked) {
      // Already asked before — don't prompt again, but re-send existing subscription
      if (Notification.permission !== 'granted') return;
    } else {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await fetch(`${API}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(sub),
    });
  } catch {}
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
