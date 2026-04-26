/* ============================================================
   Atlas — Community Page JS  (Part 1: core, auth, tabs)
   ============================================================ */

// ── Theme ──────────────────────────────────────────────────────
const themeToggle = document.getElementById('themeToggle');
const savedTheme  = localStorage.getItem('atlas-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('atlas-theme', next);
});

// ── Navbar ─────────────────────────────────────────────────────
const navbar    = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 10), { passive: true });
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.classList.toggle('active', open);
  navToggle.setAttribute('aria-expanded', open);
});

// ── Auth state ─────────────────────────────────────────────────
let currentUser = null;

function requireAuth(cb) {
  if (currentUser) { cb(currentUser); return; }
  openAuthModal();
}

function getInitials(name, email) {
  if (name && name.trim()) {
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  return email ? email[0].toUpperCase() : '?';
}

function updateProfileUI(user) {
  const initials  = user ? getInitials(user.user_metadata?.full_name, user.email) : '';
  const name      = user?.user_metadata?.full_name || user?.email || '';

  // Sidebar profile card
  const cpcAvatar = document.getElementById('cpcAvatar');
  const cpcName   = document.getElementById('cpcName');
  const cpcMeta   = document.getElementById('cpcMeta');
  if (cpcAvatar) cpcAvatar.textContent  = user ? initials : '?';
  if (cpcName)   cpcName.textContent    = user ? name : 'Sign in to post';
  if (cpcMeta)   cpcMeta.textContent    = user ? user.email : '';

  // Create-post bar avatar
  const cpaAvatar = document.getElementById('cpaAvatar');
  if (cpaAvatar) cpaAvatar.textContent = user ? initials : '?';
}

document.addEventListener('atlas:authchange', ({ detail: { user } }) => {
  currentUser = user;
  window.__atlasUser = user;
  updateProfileUI(user);
  if (user) {
    loadMyGroups();
    loadGarage();
    loadSidebarGarage();
  }
});

// ── Tabs ────────────────────────────────────────────────────────
document.querySelectorAll('.comm-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.comm-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.comm-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1))
      ?.classList.add('active');
  });
});

// ── Auth modal helpers (community page uses auth.js) ───────────
function openAuthModal() {
  const overlay = document.getElementById('authOverlay');
  if (overlay) { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
}

// ── Generic modal helpers ──────────────────────────────────────
function openModal(id)  {
  document.getElementById(id)?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
  document.body.style.overflow = '';
}

['createPostOverlay','postDetailOverlay','createGroupOverlay','addCarOverlay','authOverlay'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('click', e => { if (e.target === el) closeModal(id); });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['createPostOverlay','postDetailOverlay','createGroupOverlay','addCarOverlay','authOverlay']
      .forEach(id => closeModal(id));
  }
});

// Close buttons
document.getElementById('createPostClose') ?.addEventListener('click', () => closeModal('createPostOverlay'));
document.getElementById('postDetailClose') ?.addEventListener('click', () => closeModal('postDetailOverlay'));
document.getElementById('createGroupClose')?.addEventListener('click', () => closeModal('createGroupOverlay'));
document.getElementById('addCarClose')     ?.addEventListener('click', () => closeModal('addCarOverlay'));

// ── Utility: time ago ──────────────────────────────────────────
function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

// ── Placeholder: functions filled in later parts ───────────────
function loadMyGroups()     { /* Part 4 */ }
function loadGarage()       { /* Part 5 */ }
function loadSidebarGarage(){ /* Part 5 */ }

/* ============================================================
   Part 2: Feed — load posts, render cards, infinite scroll
   ============================================================ */

const postFeed    = document.getElementById('postFeed');
let   feedPage    = 0;
const PAGE_SIZE   = 10;
let   feedLoading = false;
let   feedDone    = false;
let   likedPostIds = new Set();

async function initFeed() {
  feedPage    = 0;
  feedDone    = false;
  postFeed.innerHTML = '<div class="feed-loading"><div class="feed-loading-spin"></div>Loading posts…</div>';
  await loadMorePosts(true);
}

async function loadMorePosts(reset = false) {
  if (feedLoading || feedDone) return;
  feedLoading = true;

  try {
    const posts = await communityGetPosts({ limit: PAGE_SIZE, offset: feedPage * PAGE_SIZE });
    if (reset) postFeed.innerHTML = '';
    if (!posts.length) {
      feedDone = true;
      if (reset) postFeed.innerHTML = '<p class="comm-empty">No posts yet — be the first to share!</p>';
      return;
    }

    // Fetch which posts current user has liked
    if (currentUser && posts.length) {
      const ids = posts.map(p => p.id);
      const liked = await communityGetLikedIds(currentUser.id, ids);
      liked.forEach(id => likedPostIds.add(id));
    }

    posts.forEach(post => {
      const card = buildPostCard(post);
      postFeed.appendChild(card);
    });
    feedPage++;
    if (posts.length < PAGE_SIZE) feedDone = true;
  } catch (err) {
    console.error('Feed load error:', err);
    if (reset) postFeed.innerHTML = '<p class="comm-empty">Could not load posts. Check your Supabase setup.</p>';
  } finally {
    feedLoading = false;
  }
}

function buildPostCard(post) {
  const profile  = post.profiles || {};
  const name     = profile.full_name || profile.username || 'Driver';
  const initials = getInitials(profile.full_name || profile.username, '');
  const liked    = likedPostIds.has(post.id);
  const road     = post.roads;

  const card = document.createElement('article');
  card.className   = 'post-card';
  card.dataset.id  = post.id;

  card.innerHTML = `
    <div class="post-header">
      <div class="post-avatar">${initials}</div>
      <div class="post-user">
        <div class="post-username">${escHtml(name)}</div>
        <div class="post-time">${timeAgo(post.created_at)}</div>
      </div>
      ${road ? `<span class="post-road-tag" title="${escHtml(road.name)}">${escHtml(road.designation || road.name)}</span>` : ''}
    </div>
    ${post.image_url
      ? `<img class="post-image" src="${escHtml(post.image_url)}" alt="post photo" loading="lazy" />`
      : ''}
    ${post.caption
      ? `<p class="post-caption">${escHtml(post.caption)}</p>`
      : ''}
    <div class="post-actions">
      <button class="post-action-btn like-btn${liked ? ' liked' : ''}" data-id="${post.id}">
        <svg viewBox="0 0 24 24" fill="${liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <span class="like-count">${post.like_count || 0}</span>
      </button>
      <button class="post-action-btn comment-btn" data-id="${post.id}" data-name="${escHtml(name)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Comments
      </button>
    </div>
  `;

  card.querySelector('.post-image')?.addEventListener('click', () => openPostDetail(post, name));
  card.querySelector('.like-btn').addEventListener('click',    e => handleLike(e, post));
  card.querySelector('.comment-btn').addEventListener('click', () => openPostDetail(post, name));

  return card;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

async function handleLike(e, post) {
  if (!currentUser) { openAuthModal(); return; }
  const btn      = e.currentTarget;
  const liked    = btn.classList.contains('liked');
  const countEl  = btn.querySelector('.like-count');
  const svg      = btn.querySelector('svg');

  // Optimistic update
  btn.classList.toggle('liked', !liked);
  svg.setAttribute('fill', !liked ? 'currentColor' : 'none');
  countEl.textContent = parseInt(countEl.textContent) + (!liked ? 1 : -1);

  try {
    if (liked) {
      await communityUnlikePost(post.id, currentUser.id);
      likedPostIds.delete(post.id);
    } else {
      await communityLikePost(post.id, currentUser.id);
      likedPostIds.add(post.id);
    }
  } catch {
    // Revert on failure
    btn.classList.toggle('liked', liked);
    svg.setAttribute('fill', liked ? 'currentColor' : 'none');
    countEl.textContent = parseInt(countEl.textContent) + (liked ? 1 : -1);
  }
}

// Infinite scroll sentinel
const sentinel = document.getElementById('feedSentinel');
new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) loadMorePosts();
}, { threshold: 0 }).observe(sentinel);

// Boot feed
initFeed();

/* ============================================================
   Part 3: Create post, post detail + comments
   ============================================================ */

// ── Open create-post modal ─────────────────────────────────────
const createPostBtn    = document.getElementById('createPostBtn');
const createPostBtnAlt = document.getElementById('createPostBtnAlt');
const createPostForm   = document.getElementById('createPostForm');
const createPostError  = document.getElementById('createPostError');
const postCaption      = document.getElementById('postCaption');
const captionCount     = document.getElementById('captionCount');
const postRoadTag      = document.getElementById('postRoadTag');
const roadSuggestions  = document.getElementById('roadSuggestions');
const postRoadId       = document.getElementById('postRoadId');
const postGroupTag     = document.getElementById('postGroupTag');

function openCreatePost() {
  requireAuth(() => openModal('createPostOverlay'));
}
createPostBtn?.addEventListener('click', openCreatePost);
createPostBtnAlt?.addEventListener('click', openCreatePost);

// Caption character count
postCaption?.addEventListener('input', () => {
  captionCount.textContent = postCaption.value.length;
});

// ── Image preview ──────────────────────────────────────────────
setupImagePreview('postImageFile', 'postImagePreview', 'uploadPlaceholder');
setupImagePreview('carImageFile',  'carImagePreview',  'carUploadPlaceholder');

function setupImagePreview(inputId, previewId, placeholderId) {
  const input  = document.getElementById(inputId);
  const img    = document.getElementById(previewId);
  const hint   = document.getElementById(placeholderId);
  if (!input) return;
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    img.src = url;
    img.classList.remove('hidden');
    if (hint) hint.style.display = 'none';
  });
}

// ── Road autocomplete ──────────────────────────────────────────
let roadSearchTimer = null;
postRoadTag?.addEventListener('input', () => {
  clearTimeout(roadSearchTimer);
  const q = postRoadTag.value.trim();
  postRoadId.value = '';
  if (q.length < 2) { roadSuggestions.classList.remove('open'); return; }
  roadSearchTimer = setTimeout(() => searchRoadsForTag(q), 250);
});

async function searchRoadsForTag(q) {
  try {
    const results = await communitySearchRoads(q);
    if (!results.length) { roadSuggestions.classList.remove('open'); return; }
    roadSuggestions.innerHTML = results.slice(0, 6).map(r =>
      `<div class="road-suggestion-item" data-id="${r.id}" data-name="${escHtml(r.name)}">
         ${escHtml(r.name)} <span style="color:var(--color-text-muted);font-size:0.72rem">· ${escHtml(r.state)}</span>
       </div>`
    ).join('');
    roadSuggestions.classList.add('open');
    roadSuggestions.querySelectorAll('.road-suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        postRoadTag.value  = item.dataset.name;
        postRoadId.value   = item.dataset.id;
        roadSuggestions.classList.remove('open');
      });
    });
  } catch { roadSuggestions.classList.remove('open'); }
}
document.addEventListener('click', e => {
  if (!roadSuggestions?.contains(e.target) && e.target !== postRoadTag)
    roadSuggestions?.classList.remove('open');
});

// ── Create post submit ─────────────────────────────────────────
createPostForm?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentUser) { openAuthModal(); return; }
  createPostError.textContent = '';

  const caption = postCaption?.value.trim();
  const file    = document.getElementById('postImageFile')?.files[0];
  if (!caption && !file) {
    createPostError.textContent = 'Add a photo or caption before posting.';
    return;
  }

  const btn = document.getElementById('createPostSubmit');
  btn.disabled = true; btn.textContent = 'Posting…';

  try {
    let imageUrl = null;
    if (file) imageUrl = await communityUploadMedia(file, `posts/${currentUser.id}`);

    const post = await communityCreatePost({
      userId:   currentUser.id,
      caption,
      imageUrl,
      roadId:   postRoadId?.value ? parseInt(postRoadId.value) : null,
      groupId:  postGroupTag?.value ? parseInt(postGroupTag.value) : null,
    });

    post.profiles = {
      full_name: currentUser.user_metadata?.full_name || '',
      username:  currentUser.email,
    };

    const card = buildPostCard(post);
    postFeed.prepend(card);
    closeModal('createPostOverlay');
    createPostForm.reset();
    captionCount.textContent = '0';
    document.getElementById('postImagePreview')?.classList.add('hidden');
    document.getElementById('uploadPlaceholder') && (document.getElementById('uploadPlaceholder').style.display = '');
  } catch (err) {
    createPostError.textContent = err.message || 'Failed to post. Try again.';
  } finally {
    btn.disabled = false; btn.textContent = 'Share Post';
  }
});

// ── Post detail + comments ─────────────────────────────────────
let detailPostId = null;

function openPostDetail(post, authorName) {
  detailPostId = post.id;
  document.getElementById('postDetailTitle').textContent = `${authorName}'s post`;

  const imgWrap = document.querySelector('.post-detail-image-wrap');
  const img     = document.getElementById('postDetailImage');
  if (post.image_url) {
    img.src = post.image_url;
    imgWrap.style.display = '';
  } else {
    imgWrap.style.display = 'none';
  }

  const info = document.getElementById('postDetailInfo');
  info.innerHTML = `
    <div style="font-weight:700;font-size:0.9rem;margin-bottom:0.3rem">${escHtml(authorName)}</div>
    ${post.caption ? `<p style="font-size:0.85rem;line-height:1.5;color:var(--color-text)">${escHtml(post.caption)}</p>` : ''}
    <div style="font-size:0.72rem;color:var(--color-text-muted);margin-top:0.4rem">${timeAgo(post.created_at)}</div>
  `;

  loadComments(post.id);
  openModal('postDetailOverlay');
}

async function loadComments(postId) {
  const container = document.getElementById('postDetailComments');
  container.innerHTML = '<div class="feed-loading"><div class="feed-loading-spin"></div></div>';
  try {
    const comments = await communityGetComments(postId);
    if (!comments.length) {
      container.innerHTML = '<p style="font-size:0.8rem;color:var(--color-text-muted);text-align:center;padding:1rem">No comments yet</p>';
      return;
    }
    container.innerHTML = '';
    comments.forEach(c => {
      const name = c.profiles?.full_name || c.profiles?.username || 'Driver';
      const div  = document.createElement('div');
      div.className = 'comment-item';
      div.innerHTML = `
        <div class="comment-avatar">${getInitials(name, '')}</div>
        <div class="comment-body">
          <div class="comment-name">${escHtml(name)}</div>
          <div class="comment-text">${escHtml(c.body)}</div>
          <div class="comment-time">${timeAgo(c.created_at)}</div>
        </div>
      `;
      container.appendChild(div);
    });
  } catch {
    container.innerHTML = '<p style="font-size:0.8rem;color:var(--color-text-muted);text-align:center;padding:1rem">Could not load comments.</p>';
  }
}

document.getElementById('commentForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentUser) { openAuthModal(); return; }
  const input = document.getElementById('commentInput');
  const body  = input?.value.trim();
  if (!body || !detailPostId) return;
  input.value = '';
  try {
    await communityAddComment({ postId: detailPostId, userId: currentUser.id, body });
    loadComments(detailPostId);
  } catch { /* silent */ }
});
