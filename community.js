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
  const card      = document.getElementById('commProfileCard');
  if (cpcAvatar) cpcAvatar.textContent  = user ? initials : '?';
  if (cpcName)   cpcName.textContent    = user ? name : 'Sign in to post';
  if (cpcMeta)   cpcMeta.textContent    = user ? user.email : '';
  if (card && user) card.style.cursor = 'pointer';
  if (card) {
    card.onclick = user ? () => { window.location.href = `profile.html?id=${user.id}`; } : null;
  }

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
  const el = document.getElementById(id);
  if (!el) return;
  // Clear any stale error messages
  el.querySelectorAll('.auth-error').forEach(e => { e.textContent = ''; });
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
  document.body.style.overflow = '';
}

['createPostOverlay','postDetailOverlay','createGroupOverlay','addCarOverlay','createEventOverlay','authOverlay'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('click', e => { if (e.target === el) closeModal(id); });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['createPostOverlay','postDetailOverlay','createGroupOverlay','addCarOverlay','createEventOverlay','authOverlay']
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


/* ============================================================
   Part 2: Feed — load posts, render cards, infinite scroll
   ============================================================ */

const postFeed    = document.getElementById('postFeed');
let   feedPage    = 0;
const PAGE_SIZE   = 10;
let   feedLoading = false;
let   feedDone    = false;
let   likedPostIds = new Set();
let   feedFilter  = { road: '', region: '' };
let   feedMode    = 'all'; // 'all' | 'following'

// ── Feed mode toggle ───────────────────────────────────────────
document.getElementById('feedModeAll')?.addEventListener('click', () => {
  if (feedMode === 'all') return;
  feedMode = 'all';
  document.getElementById('feedModeAll')?.classList.add('active');
  document.getElementById('feedModeFollowing')?.classList.remove('active');
  resetAndReload();
});
document.getElementById('feedModeFollowing')?.addEventListener('click', () => {
  if (feedMode === 'following') return;
  feedMode = 'following';
  document.getElementById('feedModeFollowing')?.classList.add('active');
  document.getElementById('feedModeAll')?.classList.remove('active');
  resetAndReload();
});

// ── Search / filter bar ────────────────────────────────────────
const feedSearchInput  = document.getElementById('feedSearch');
const feedSearchClear  = document.getElementById('feedSearchClear');
const feedRegionFilter = document.getElementById('feedRegionFilter');

communityGetRegions().then(regions => {
  regions.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r;
    opt.textContent = r;
    feedRegionFilter.appendChild(opt);
  });
}).catch(() => {});

let searchDebounce = null;
feedSearchInput?.addEventListener('input', () => {
  feedFilter.road = feedSearchInput.value.trim();
  feedSearchClear?.classList.toggle('hidden', !feedFilter.road);
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => resetAndReload(), 400);
});
feedSearchClear?.addEventListener('click', () => {
  feedSearchInput.value = '';
  feedFilter.road = '';
  feedSearchClear.classList.add('hidden');
  resetAndReload();
});
feedRegionFilter?.addEventListener('change', () => {
  feedFilter.region = feedRegionFilter.value;
  resetAndReload();
});

function resetAndReload() {
  feedPage = 0;
  feedDone = false;
  likedPostIds = new Set();
  postFeed.innerHTML = '<div class="feed-loading"><div class="feed-loading-spin"></div>Loading posts…</div>';
  loadMorePosts(true);
}

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
    let posts;
    if (feedMode === 'following' && currentUser) {
      posts = await communityGetFollowingPosts(currentUser.id, {
        limit:  PAGE_SIZE,
        offset: feedPage * PAGE_SIZE,
      });
    } else {
      posts = await communityGetPosts({
        limit:  PAGE_SIZE,
        offset: feedPage * PAGE_SIZE,
        road:   feedFilter.road,
        region: feedFilter.region,
      });
    }
    if (reset) postFeed.innerHTML = '';
    if (!posts.length) {
      feedDone = true;
      if (reset) {
        let msg = 'No posts yet — be the first to share!';
        if (feedMode === 'following') msg = 'No posts from people you follow yet.';
        else if (feedFilter.road || feedFilter.region) msg = 'No posts found for that filter.';
        postFeed.innerHTML = `<p class="comm-empty">${msg}</p>`;
      }
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
  const avatarContent = profile.avatar_url
    ? `<img src="${escHtml(profile.avatar_url)}" alt="${escHtml(name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
    : initials;

  const card = document.createElement('article');
  card.className   = 'post-card';
  card.dataset.id  = post.id;

  const profileUrl = `profile.html?id=${post.user_id}`;
  card.innerHTML = `
    <div class="post-header">
      <a class="post-avatar" href="${profileUrl}">${avatarContent}</a>
      <div class="post-user">
        <a class="post-username" href="${profileUrl}">${escHtml(name)}</a>
        <div class="post-time">${timeAgo(post.created_at)}</div>
      </div>
      ${road ? `<a class="post-road-tag" href="map.html?road=${encodeURIComponent(road.name)}&lat=${road.lat || ''}&lng=${road.lng || ''}" title="${escHtml(road.name)}">${escHtml(road.designation || road.name)}</a>` : ''}
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
    <a href="profile.html?id=${post.user_id}" style="font-weight:700;font-size:0.9rem;margin-bottom:0.3rem;display:block;color:var(--color-text);text-decoration:none">${escHtml(authorName)}</a>
    ${post.caption ? `<p style="font-size:0.85rem;line-height:1.5;color:var(--color-text);margin-top:0.3rem">${escHtml(post.caption)}</p>` : ''}
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

/* ============================================================
   Part 4: Driving Groups
   ============================================================ */

const groupsGrid    = document.getElementById('groupsGrid');
const discoverEl    = document.getElementById('discoverGroups');
const myGroupsList  = document.getElementById('myGroupsList');
const createGroupBtn  = document.getElementById('createGroupBtn');
const createGroupForm = document.getElementById('createGroupForm');
const createGroupErr  = document.getElementById('createGroupError');

let joinedGroupIds = new Set();

createGroupBtn?.addEventListener('click', () => requireAuth(() => openModal('createGroupOverlay')));

async function initGroups() {
  groupsGrid.innerHTML = '<div class="feed-loading"><div class="feed-loading-spin"></div>Loading…</div>';
  try {
    const groups = await communityGetGroups();

    if (currentUser) {
      const joined = await communityGetJoinedGroupIds(currentUser.id);
      joined.forEach(id => joinedGroupIds.add(id));
      populateGroupSelector(groups.filter(g => joinedGroupIds.has(g.id)));
    }

    groupsGrid.innerHTML = '';
    if (!groups.length) {
      groupsGrid.innerHTML = '<p class="comm-empty">No groups yet — create the first one!</p>';
    } else {
      groups.forEach(g => groupsGrid.appendChild(buildGroupCard(g)));
    }

    // Discover sidebar (top 5)
    if (discoverEl) {
      discoverEl.innerHTML = '';
      groups.slice(0, 5).forEach(g => {
        const div = document.createElement('div');
        div.className = 'discover-group-item';
        div.innerHTML = `
          <div>
            <div class="discover-group-name">${escHtml(g.name)}</div>
            <div class="discover-group-count">${g.member_count} member${g.member_count !== 1 ? 's' : ''}</div>
          </div>
          <button class="group-join-btn${joinedGroupIds.has(g.id) ? ' joined' : ''}" data-gid="${g.id}">
            ${joinedGroupIds.has(g.id) ? 'Joined' : 'Join'}
          </button>
        `;
        div.querySelector('.group-join-btn').addEventListener('click', e => handleJoin(e, g));
        discoverEl.appendChild(div);
      });
    }
  } catch (err) {
    groupsGrid.innerHTML = '<p class="comm-empty">Could not load groups.</p>';
    console.error(err);
  }
}

function buildGroupCard(group) {
  const initials = group.name.slice(0, 2).toUpperCase();
  const joined   = joinedGroupIds.has(group.id);
  const card     = document.createElement('div');
  card.className = 'group-card';
  card.dataset.gid = group.id;
  card.innerHTML = `
    <div class="group-banner">${initials}</div>
    <div class="group-body">
      <div class="group-name">${escHtml(group.name)}</div>
      <div class="group-desc">${escHtml(group.description || 'No description')}</div>
      <div class="group-meta">
        <span>${group.member_count} member${group.member_count !== 1 ? 's' : ''}</span>
        ${group.region ? `<span>${escHtml(group.region)}</span>` : ''}
      </div>
    </div>
    <div style="padding:0 1rem 1rem">
      <button class="group-join-btn${joined ? ' joined' : ''}" style="width:100%">
        ${joined ? 'Joined ✓' : 'Join Group'}
      </button>
    </div>
  `;
  card.querySelector('.group-join-btn').addEventListener('click', e => handleJoin(e, group));
  return card;
}

async function handleJoin(e, group) {
  if (!currentUser) { openAuthModal(); return; }
  const btn    = e.currentTarget;
  const joined = joinedGroupIds.has(group.id);
  btn.disabled = true;
  try {
    if (joined) {
      await communityLeaveGroup(group.id, currentUser.id);
      joinedGroupIds.delete(group.id);
      btn.textContent = 'Join Group';
      btn.classList.remove('joined');
      document.querySelectorAll(`[data-gid="${group.id}"] .group-join-btn`).forEach(b => {
        b.textContent = 'Join Group'; b.classList.remove('joined');
      });
    } else {
      await communityJoinGroup(group.id, currentUser.id);
      joinedGroupIds.add(group.id);
      btn.textContent = 'Joined ✓';
      btn.classList.add('joined');
      document.querySelectorAll(`[data-gid="${group.id}"] .group-join-btn`).forEach(b => {
        b.textContent = 'Joined ✓'; b.classList.add('joined');
      });
    }
    loadMyGroups();
  } catch (err) {
    console.error('Join error:', err);
  } finally {
    btn.disabled = false;
  }
}

// My groups sidebar list
async function loadMyGroups() {
  if (!currentUser || !myGroupsList) return;
  try {
    const all    = await communityGetGroups();
    const joined = all.filter(g => joinedGroupIds.has(g.id));
    if (!joined.length) {
      myGroupsList.innerHTML = '<p class="comm-empty-sm">No groups yet</p>';
      return;
    }
    myGroupsList.innerHTML = joined.map(g =>
      `<div class="sidebar-group-item">
         <div class="sidebar-group-dot"></div>
         <span>${escHtml(g.name)}</span>
       </div>`
    ).join('');
  } catch { /* silent */ }
}

function populateGroupSelector(joinedGroups) {
  if (!postGroupTag) return;
  postGroupTag.innerHTML = '<option value="">— Public post —</option>';
  joinedGroups.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = g.name;
    postGroupTag.appendChild(opt);
  });
}

// Create group submit
createGroupForm?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentUser) { openAuthModal(); return; }
  createGroupErr.textContent = '';

  const name = document.getElementById('groupName')?.value.trim();
  if (!name) { createGroupErr.textContent = 'Group name is required.'; return; }

  const btn = createGroupForm.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Creating…';

  try {
    const group = await communityCreateGroup({
      name,
      description: document.getElementById('groupDesc')?.value.trim() || null,
      region:      document.getElementById('groupRegion')?.value || null,
      createdBy:   currentUser.id,
    });
    joinedGroupIds.add(group.id);
    closeModal('createGroupOverlay');
    createGroupForm.reset();
    initGroups();
  } catch (err) {
    createGroupErr.textContent = err.message || 'Failed to create group.';
  } finally {
    btn.disabled = false; btn.textContent = 'Create Group';
  }
});

// Boot groups
initGroups();

/* ============================================================
   Part 5: Garage
   ============================================================ */

const garageGrid   = document.getElementById('garageGrid');
const addCarBtn    = document.getElementById('addCarBtn');
const sidebarAddCarBtn = document.getElementById('sidebarAddCarBtn');
const addCarForm   = document.getElementById('addCarForm');
const addCarError  = document.getElementById('addCarError');

addCarBtn?.addEventListener('click',        () => requireAuth(() => openModal('addCarOverlay')));
sidebarAddCarBtn?.addEventListener('click', () => requireAuth(() => openModal('addCarOverlay')));

async function loadGarage() {
  if (!currentUser || !garageGrid) return;
  garageGrid.innerHTML = '<div class="feed-loading"><div class="feed-loading-spin"></div>Loading…</div>';
  try {
    const cars = await communityGetGarage(currentUser.id);
    garageGrid.innerHTML = '';
    if (!cars.length) {
      garageGrid.innerHTML = '<p class="comm-empty">Your garage is empty.<br>Add your first car!</p>';
      return;
    }
    cars.forEach(car => garageGrid.appendChild(buildCarCard(car)));
  } catch {
    garageGrid.innerHTML = '<p class="comm-empty">Could not load garage.</p>';
  }
}

async function loadSidebarGarage() {
  const sidebarEl = document.getElementById('sidebarGarage');
  if (!currentUser || !sidebarEl) return;
  try {
    const cars = await communityGetGarage(currentUser.id);
    if (!cars.length) { sidebarEl.innerHTML = '<p class="comm-empty-sm">No cars yet</p>'; return; }
    sidebarEl.innerHTML = '';
    cars.slice(0, 3).forEach(car => {
      const div = document.createElement('div');
      div.className = 'sidebar-car-item';
      div.innerHTML = `
        ${car.image_url
          ? `<img class="sidebar-car-thumb" src="${escHtml(car.image_url)}" alt="car" />`
          : `<div class="sidebar-car-thumb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg></div>`}
        <div class="sidebar-car-name">${car.year ? car.year + ' ' : ''}${escHtml(car.make)} ${escHtml(car.model)}</div>
      `;
      sidebarEl.appendChild(div);
    });
  } catch { /* silent */ }
}

function buildCarCard(car) {
  const card = document.createElement('div');
  card.className = 'car-card';
  card.innerHTML = `
    ${car.image_url
      ? `<img class="car-image" src="${escHtml(car.image_url)}" alt="car photo" loading="lazy" />`
      : `<div class="car-image-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg></div>`}
    <div class="car-body">
      <div class="car-title">${car.year ? car.year + ' ' : ''}${escHtml(car.make)} ${escHtml(car.model)}${car.trim_level ? ' ' + escHtml(car.trim_level) : ''}</div>
      ${car.color ? `<div class="car-color-badge">● ${escHtml(car.color)}</div>` : ''}
      ${car.mods  ? `<div class="car-mods">${escHtml(car.mods)}</div>` : ''}
    </div>
    <div class="car-footer">
      ${car.is_primary ? '<span class="car-primary-badge">Primary</span>' : '<span></span>'}
      <button class="car-delete-btn" data-cid="${car.id}">Remove</button>
    </div>
  `;
  card.querySelector('.car-delete-btn').addEventListener('click', () => handleDeleteCar(car.id));
  return card;
}

async function handleDeleteCar(carId) {
  if (!currentUser) return;
  if (!confirm('Remove this car from your garage?')) return;
  try {
    await communityDeleteCar(carId);
    loadGarage();
    loadSidebarGarage();
  } catch { /* silent */ }
}

addCarForm?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentUser) { openAuthModal(); return; }
  addCarError.textContent = '';

  const make = document.getElementById('carMake')?.value.trim();
  const model = document.getElementById('carModel')?.value.trim();
  if (!make || !model) {
    addCarError.textContent = 'Make and model are required.'; return;
  }

  const btn = addCarForm.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Adding…';

  try {
    const file = document.getElementById('carImageFile')?.files[0];
    let imageUrl = null;
    if (file) imageUrl = await communityUploadMedia(file, `garage/${currentUser.id}`);

    await communityAddCar({
      userId:    currentUser.id,
      year:      parseInt(document.getElementById('carYear')?.value) || null,
      make,
      model,
      trimLevel: document.getElementById('carTrim')?.value.trim() || null,
      color:     document.getElementById('carColor')?.value.trim() || null,
      mods:      document.getElementById('carMods')?.value.trim() || null,
      imageUrl,
      isPrimary: document.getElementById('carPrimary')?.checked || false,
    });

    closeModal('addCarOverlay');
    addCarForm.reset();
    document.getElementById('carImagePreview')?.classList.add('hidden');
    document.getElementById('carUploadPlaceholder') && (document.getElementById('carUploadPlaceholder').style.display = '');
    loadGarage();
    loadSidebarGarage();
  } catch (err) {
    addCarError.textContent = err.message || 'Failed to add car.';
  } finally {
    btn.disabled = false; btn.textContent = 'Add to Garage';
  }
});

/* ============================================================
   Part 6: Events
   ============================================================ */

// ── Load & render events list ──────────────────────────────────
async function initEvents() {
  const list = document.getElementById('eventsList');
  if (!list) return;
  list.innerHTML = '<div class="feed-loading"><div class="feed-loading-spin"></div> Loading…</div>';
  try {
    const events = await eventsGetUpcoming();
    if (!events.length) {
      list.innerHTML = '<p class="comm-empty">No upcoming events. Be the first to create one!</p>';
      return;
    }
    list.innerHTML = '';
    for (const ev of events) {
      const card = await buildEventCard(ev);
      list.appendChild(card);
    }
  } catch {
    list.innerHTML = '<p class="comm-empty">Could not load events.</p>';
  }
}

async function buildEventCard(ev) {
  const card = document.createElement('div');
  card.className = 'event-card';

  const date    = new Date(ev.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const group   = ev.driving_groups?.name || '';
  const road    = ev.roads ? `${ev.roads.name}${ev.roads.state ? ', ' + ev.roads.state : ''}` : '';
  const creator = ev.profiles?.full_name || ev.profiles?.username || 'Driver';

  let rsvpStatus = null;
  if (currentUser) {
    try { rsvpStatus = await eventsGetUserRsvp(ev.id, currentUser.id); } catch { /* ignore */ }
  }

  card.innerHTML = `
    <div class="event-date-badge">
      <span class="event-month">${new Date(ev.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}</span>
      <span class="event-day">${new Date(ev.event_date + 'T00:00:00').getDate()}</span>
    </div>
    <div class="event-body">
      <div class="event-title">${escHtml(ev.title)}</div>
      ${group  ? `<div class="event-meta-item"><span>Group:</span> ${escHtml(group)}</div>` : ''}
      ${road   ? `<div class="event-meta-item"><span>Road:</span> ${escHtml(road)}</div>` : ''}
      ${ev.meet_location ? `<div class="event-meta-item"><span>Meet:</span> ${escHtml(ev.meet_location)}</div>` : ''}
      ${ev.description ? `<p class="event-desc">${escHtml(ev.description)}</p>` : ''}
      <div class="event-meta-item" style="color:var(--color-text-muted);font-size:0.72rem">By ${escHtml(creator)} · ${date}</div>
    </div>
    <div class="event-actions">
      <button class="event-rsvp-btn ${rsvpStatus === 'going' ? 'going' : ''}" data-ev="${ev.id}">
        ${rsvpStatus === 'going' ? '✓ Going' : 'RSVP'}
      </button>
    </div>
  `;

  card.querySelector('.event-rsvp-btn')?.addEventListener('click', async function () {
    if (!currentUser) { openAuthModal(); return; }
    const btn = this;
    const isGoing = btn.classList.contains('going');
    btn.disabled = true;
    try {
      await eventsRsvp(ev.id, currentUser.id, isGoing ? 'not_going' : 'going');
      btn.classList.toggle('going', !isGoing);
      btn.textContent = !isGoing ? '✓ Going' : 'RSVP';
    } catch { /* silent */ } finally {
      btn.disabled = false;
    }
  });

  return card;
}

// ── Tab activation ─────────────────────────────────────────────
let eventsLoaded = false;
document.querySelectorAll('.comm-tab').forEach(tab => {
  if (tab.dataset.tab === 'events') {
    tab.addEventListener('click', () => {
      if (!eventsLoaded) { eventsLoaded = true; initEvents(); }
    });
  }
});

// ── Create event modal ─────────────────────────────────────────
document.getElementById('createEventBtn')?.addEventListener('click', () => {
  requireAuth(() => {
    populateEventGroupSelector();
    openModal('createEventOverlay');
  });
});
document.getElementById('createEventClose')?.addEventListener('click', () => closeModal('createEventOverlay'));
document.getElementById('createEventOverlay')?.addEventListener('click', e => {
  if (e.target === document.getElementById('createEventOverlay')) closeModal('createEventOverlay');
});

async function populateEventGroupSelector() {
  const sel = document.getElementById('eventGroup');
  if (!sel || !currentUser) return;
  sel.innerHTML = '<option value="">Open event (no group)</option>';
  try {
    const { data } = await db.from('group_members')
      .select('driving_groups(id, name)')
      .eq('user_id', currentUser.id);
    (data || []).forEach(r => {
      if (!r.driving_groups) return;
      const opt = document.createElement('option');
      opt.value = r.driving_groups.id;
      opt.textContent = r.driving_groups.name;
      sel.appendChild(opt);
    });
  } catch { /* silent */ }
}

// Road autocomplete for event form
let eventRoadId = null;
const eventRoadInput = document.getElementById('eventRoad');
const eventRoadSugg  = document.getElementById('eventRoadSuggestions');

let eventRoadDebounce = null;
eventRoadInput?.addEventListener('input', () => {
  eventRoadId = null;
  document.getElementById('eventRoadId').value = '';
  clearTimeout(eventRoadDebounce);
  const q = eventRoadInput.value.trim();
  if (q.length < 2) { eventRoadSugg.innerHTML = ''; return; }
  eventRoadDebounce = setTimeout(async () => {
    const results = await communitySearchRoads(q);
    eventRoadSugg.innerHTML = '';
    results.forEach(r => {
      const item = document.createElement('div');
      item.className = 'road-suggestion-item';
      item.textContent = `${r.name}${r.state ? ', ' + r.state : ''}`;
      item.addEventListener('click', () => {
        eventRoadInput.value = item.textContent;
        eventRoadId = r.id;
        document.getElementById('eventRoadId').value = r.id;
        eventRoadSugg.innerHTML = '';
      });
      eventRoadSugg.appendChild(item);
    });
  }, 300);
});

document.getElementById('createEventForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const sessionUser = (await db.auth.getSession()).data.session?.user;
  if (!sessionUser) { openAuthModal(); return; }

  const errEl = document.getElementById('eventError');
  errEl.textContent = '';
  const btn  = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Creating…';

  try {
    await eventsCreate({
      groupId:      document.getElementById('eventGroup')?.value || null,
      createdBy:    sessionUser.id,
      title:        document.getElementById('eventTitle').value.trim(),
      description:  document.getElementById('eventDesc')?.value.trim() || null,
      roadId:       eventRoadId || null,
      eventDate:    document.getElementById('eventDate').value,
      meetLocation: document.getElementById('eventLocation')?.value.trim() || null,
    });
    closeModal('createEventOverlay');
    e.target.reset();
    eventRoadId = null;
    eventsLoaded = false;
    initEvents();
  } catch (err) {
    errEl.textContent = err.message || 'Failed to create event.';
  } finally {
    btn.disabled = false; btn.textContent = 'Create Event';
  }
});
