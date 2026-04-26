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
