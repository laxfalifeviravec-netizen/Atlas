/* ============================================================
   Atlas — Profile Page JS
   ============================================================ */

// ── Theme + Navbar ──────────────────────────────────────────────
const themeToggle = document.getElementById('themeToggle');
const savedTheme  = localStorage.getItem('atlas-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('atlas-theme', next);
});
const navbar    = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 10), { passive: true });
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.classList.toggle('active', open);
  navToggle.setAttribute('aria-expanded', open);
});

// ── Utilities ───────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}
function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}
function openModal(id)  { document.getElementById(id)?.classList.add('open');    document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); document.body.style.overflow = ''; }

// ── State ────────────────────────────────────────────────────────
const params      = new URLSearchParams(window.location.search);
const profileId   = params.get('id');
let   viewerUser  = null;   // currently signed-in user
let   profileData = null;   // the profile being viewed
let   lightboxPostId = null;

// ── Tabs ─────────────────────────────────────────────────────────
document.querySelectorAll('.comm-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.comm-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.comm-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const panelId = 'panel' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1);
    document.getElementById(panelId)?.classList.add('active');
  });
});

// ── Auth ─────────────────────────────────────────────────────────
document.addEventListener('atlas:authchange', ({ detail: { user } }) => {
  viewerUser = user;
  window.__atlasUser = user;
  if (profileId) renderOwnControls();
});

async function renderOwnControls() {
  const isOwn = viewerUser && profileData && viewerUser.id === profileId;
  document.getElementById('avatarEditBtn')?.classList.toggle('hidden', !isOwn);
  const actionsEl = document.getElementById('profileActions');
  if (!actionsEl) return;
  if (isOwn) {
    actionsEl.innerHTML = `<button class="profile-edit-btn" id="editProfileBtn">Edit Profile</button>`;
  } else if (viewerUser && profileId) {
    let following = false;
    try { following = await isFollowing(viewerUser.id, profileId); } catch { /* ignore */ }
    actionsEl.innerHTML = `
      <button class="profile-follow-btn${following ? ' following' : ''}" id="followBtn">
        ${following ? 'Following' : 'Follow'}
      </button>
    `;
    document.getElementById('followBtn')?.addEventListener('click', handleFollowToggle);
  } else {
    actionsEl.innerHTML = '';
  }
}

async function handleFollowToggle() {
  if (!viewerUser) { openModal('authOverlay'); return; }
  const btn = document.getElementById('followBtn');
  if (!btn) return;
  const currently = btn.classList.contains('following');
  btn.disabled = true;
  try {
    if (currently) {
      await unfollowUser(viewerUser.id, profileId);
      btn.textContent = 'Follow';
      btn.classList.remove('following');
    } else {
      await followUser(viewerUser.id, profileId);
      btn.textContent = 'Following';
      btn.classList.add('following');
    }
    loadFollowStats();
  } catch { /* silent */ } finally {
    btn.disabled = false;
  }
}

async function loadFollowStats() {
  try {
    const [followers, following] = await Promise.all([
      getFollowerCount(profileId),
      getFollowingCount(profileId),
    ]);
    updateStat('followers', followers);
    updateStat('following', following);
  } catch { /* silent */ }
}

// ── Lightbox (post detail) ────────────────────────────────────────
document.getElementById('lightboxClose')?.addEventListener('click', () => closeModal('lightboxOverlay'));
document.getElementById('lightboxOverlay')?.addEventListener('click', e => {
  if (e.target === document.getElementById('lightboxOverlay')) closeModal('lightboxOverlay');
});

function openLightbox(post) {
  lightboxPostId = post.id;
  const name = profileData?.full_name || profileData?.username || 'Driver';
  document.getElementById('lightboxTitle').textContent = `${name}'s post`;

  const imgWrap = document.querySelector('#lightboxOverlay .post-detail-image-wrap');
  const img     = document.getElementById('lightboxImage');
  if (post.image_url) { img.src = post.image_url; imgWrap.style.display = ''; }
  else                { imgWrap.style.display = 'none'; }

  document.getElementById('lightboxInfo').innerHTML = `
    <a href="profile.html?id=${escHtml(post.user_id)}" style="font-weight:700;font-size:0.9rem;color:var(--color-text);text-decoration:none">${escHtml(name)}</a>
    ${post.caption ? `<p style="font-size:0.85rem;margin-top:0.35rem;line-height:1.5;color:var(--color-text)">${escHtml(post.caption)}</p>` : ''}
    <div style="font-size:0.72rem;color:var(--color-text-muted);margin-top:0.4rem">${timeAgo(post.created_at)}</div>
  `;

  loadLightboxComments(post.id);
  openModal('lightboxOverlay');
}

async function loadLightboxComments(postId) {
  const container = document.getElementById('lightboxComments');
  container.innerHTML = '<div class="feed-loading"><div class="feed-loading-spin"></div></div>';
  try {
    const comments = await communityGetComments(postId);
    if (!comments.length) {
      container.innerHTML = '<p style="font-size:0.8rem;color:var(--color-text-muted);text-align:center;padding:1rem">No comments yet</p>';
      return;
    }
    container.innerHTML = '';
    comments.forEach(c => {
      const n = c.profiles?.full_name || c.profiles?.username || 'Driver';
      const div = document.createElement('div');
      div.className = 'comment-item';
      div.innerHTML = `
        <a class="comment-avatar" href="profile.html?id=${escHtml(c.user_id)}" style="text-decoration:none">${getInitials(n)}</a>
        <div class="comment-body">
          <a class="comment-name" href="profile.html?id=${escHtml(c.user_id)}" style="text-decoration:none;color:var(--color-text)">${escHtml(n)}</a>
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

document.getElementById('lightboxCommentForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!viewerUser) { openModal('authOverlay'); return; }
  const input = document.getElementById('lightboxCommentInput');
  const body  = input?.value.trim();
  if (!body || !lightboxPostId) return;
  input.value = '';
  try {
    await communityAddComment({ postId: lightboxPostId, userId: viewerUser.id, body });
    loadLightboxComments(lightboxPostId);
  } catch { /* silent */ }
});

// ── Load profile + all tabs ───────────────────────────────────────
async function init() {
  if (!profileId) {
    document.getElementById('profileName').textContent = 'Profile not found';
    return;
  }

  try {
    profileData = await profileGetUser(profileId);
    renderHeader(profileData);
  } catch {
    document.getElementById('profileName').textContent = 'User not found';
    return;
  }

  loadPostsGrid();
  loadProfileGarage();
  loadProfileGroups();
  loadFollowStats();
}

function renderHeader(profile) {
  const name     = profile.full_name || profile.username || 'Atlas Driver';
  const initials = getInitials(name);

  document.title = `Atlas — ${name}`;
  document.getElementById('profileAvatar').textContent = initials;
  document.getElementById('profileName').textContent   = name;
  document.getElementById('profileMeta').textContent   =
    `Member since ${new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
}

// ── Posts grid ────────────────────────────────────────────────────
async function loadPostsGrid() {
  const grid = document.getElementById('profilePostsGrid');
  try {
    const posts = await profileGetPosts(profileId);

    // Update stat
    updateStat('posts', posts.length);

    if (!posts.length) {
      grid.innerHTML = '<p class="comm-empty" style="grid-column:1/-1">No posts yet.</p>';
      return;
    }

    grid.innerHTML = '';
    posts.forEach(post => {
      const cell = document.createElement('div');
      if (post.image_url) {
        cell.className = 'profile-post-thumb';
        cell.innerHTML = `
          <img src="${escHtml(post.image_url)}" alt="post" loading="lazy" />
          <div class="profile-post-thumb-overlay">
            <span>♥ ${post.like_count || 0}</span>
          </div>
        `;
      } else {
        cell.className = 'profile-post-no-img';
        cell.textContent = post.caption ? post.caption.slice(0, 80) + (post.caption.length > 80 ? '…' : '') : '—';
      }
      cell.addEventListener('click', () => openLightbox(post));
      grid.appendChild(cell);
    });
  } catch {
    grid.innerHTML = '<p class="comm-empty" style="grid-column:1/-1">Could not load posts.</p>';
  }
}

// ── Garage tab ────────────────────────────────────────────────────
async function loadProfileGarage() {
  const grid = document.getElementById('profileGarageGrid');
  try {
    const cars = await communityGetGarage(profileId);
    updateStat('cars', cars.length);

    if (!cars.length) {
      grid.innerHTML = '<p class="comm-empty">No cars in garage.</p>';
      return;
    }
    grid.innerHTML = '';
    cars.forEach(car => {
      const card = document.createElement('div');
      card.className = 'car-card';
      card.innerHTML = `
        ${car.image_url
          ? `<img class="car-image" src="${escHtml(car.image_url)}" alt="car" loading="lazy" />`
          : `<div class="car-image-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg></div>`}
        <div class="car-body">
          <div class="car-title">${car.year ? car.year + ' ' : ''}${escHtml(car.make)} ${escHtml(car.model)}${car.trim_level ? ' ' + escHtml(car.trim_level) : ''}</div>
          ${car.color ? `<div class="car-color-badge">● ${escHtml(car.color)}</div>` : ''}
          ${car.mods  ? `<div class="car-mods">${escHtml(car.mods)}</div>` : ''}
        </div>
        <div class="car-footer">
          ${car.is_primary ? '<span class="car-primary-badge">Primary</span>' : '<span></span>'}
        </div>
      `;
      grid.appendChild(card);
    });
  } catch {
    grid.innerHTML = '<p class="comm-empty">Could not load garage.</p>';
  }
}

// ── Groups tab ────────────────────────────────────────────────────
async function loadProfileGroups() {
  const grid = document.getElementById('profileGroupsGrid');
  try {
    const groups = await profileGetGroups(profileId);
    updateStat('groups', groups.length);

    if (!groups.length) {
      grid.innerHTML = '<p class="comm-empty">Not in any groups yet.</p>';
      return;
    }
    grid.innerHTML = '';
    groups.forEach(g => {
      const card = document.createElement('div');
      card.className = 'group-card';
      const initials = g.name.slice(0, 2).toUpperCase();
      card.innerHTML = `
        <div class="group-banner">${initials}</div>
        <div class="group-body">
          <div class="group-name">${escHtml(g.name)}</div>
          <div class="group-desc">${escHtml(g.description || 'No description')}</div>
          <div class="group-meta">
            <span>${g.member_count} member${g.member_count !== 1 ? 's' : ''}</span>
            ${g.region ? `<span>${escHtml(g.region)}</span>` : ''}
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch {
    grid.innerHTML = '<p class="comm-empty">Could not load groups.</p>';
  }
}

// ── Stat counters ─────────────────────────────────────────────────
const statValues = { posts: '—', followers: '—', following: '—', cars: '—', groups: '—' };
function updateStat(key, val) {
  statValues[key] = val;
  const statsEl = document.getElementById('profileStats');
  if (!statsEl) return;
  statsEl.innerHTML = Object.entries(statValues).map(([k, v]) => `
    <div class="profile-stat">
      <span class="profile-stat-val">${v}</span>
      <span class="profile-stat-label">${k}</span>
    </div>
  `).join('');
}
updateStat('posts', '—');

init();
