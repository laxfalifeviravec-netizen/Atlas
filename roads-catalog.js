const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001' : '';

let allRoads = [];
let activeDiff = '';

const grid    = document.getElementById('rcGrid');
const loading = document.getElementById('rcLoading');
const empty   = document.getElementById('rcEmpty');

function diffClass(d) {
  if (!d) return '';
  return d.toLowerCase();
}

function buildCard(road) {
  const card = document.createElement('div');
  card.className = 'rc-card';
  card.innerHTML = `
    <div class="rc-card-top">
      <div class="rc-card-name">${esc(road.name)}</div>
      ${road.difficulty ? `<span class="rc-diff-badge ${diffClass(road.difficulty)}">${esc(road.difficulty)}</span>` : ''}
    </div>
    ${road.region ? `<div class="rc-card-region">${esc(road.region)}</div>` : ''}
    ${road.description ? `<div class="rc-card-desc">${esc(road.description)}</div>` : ''}
    <div class="rc-card-footer">
      <span class="rc-card-stat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        ${road.likes || 0}
      </span>
      ${road.points ? `<span class="rc-card-stat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ${road.points} pts
      </span>` : ''}
    </div>
  `;
  card.addEventListener('click', () => openDetail(road));
  return card;
}

function render(roads) {
  grid.innerHTML = '';
  if (!roads.length) {
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';
  roads.forEach(r => grid.appendChild(buildCard(r)));
}

async function loadRoads() {
  try {
    const res = await fetch(`${API}/api/roads`);
    const data = await res.json();
    allRoads = Array.isArray(data) ? data : (data.roads || []);
  } catch {
    allRoads = [];
  }
  loading.style.display = 'none';
  applyFilter();
}

function applyFilter() {
  const filtered = activeDiff
    ? allRoads.filter(r => (r.difficulty || '').toLowerCase() === activeDiff.toLowerCase())
    : allRoads;
  render(filtered);
}

document.getElementById('rcFilters').addEventListener('click', e => {
  const chip = e.target.closest('.rc-chip');
  if (!chip) return;
  document.querySelectorAll('.rc-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  activeDiff = chip.dataset.diff || '';
  applyFilter();
});

/* ── Detail modal ─── */
const overlay = document.getElementById('rdOverlay');
const rdName  = document.getElementById('rdName');
const rdBody  = document.getElementById('rdBody');
let currentRoad = null;
let liked = false;

function openDetail(road) {
  currentRoad = road;
  liked = false;
  rdName.textContent = road.name;
  rdBody.innerHTML = buildDetailBody(road, liked);
  overlay.classList.add('open');
  bindDetailActions();
}

function buildDetailBody(road, isLiked) {
  const rows = [];

  if (road.region) {
    rows.push(`<div class="rd-section-label">Region</div><div class="rd-value">${esc(road.region)}</div>`);
  }
  if (road.difficulty) {
    rows.push(`<div class="rd-section-label">Difficulty</div>
      <div class="rd-tags"><span class="rc-diff-badge ${diffClass(road.difficulty)}">${esc(road.difficulty)}</span></div>`);
  }
  if (road.description) {
    rows.push(`<div class="rd-section-label">About</div><div class="rd-value">${esc(road.description)}</div>`);
  }
  if (road.points) {
    rows.push(`<div class="rd-section-label">Points</div><div class="rd-value">${road.points}</div>`);
  }

  rows.push(`
    <div class="rd-like-row">
      <button class="rd-like-btn${isLiked ? ' liked' : ''}" id="rdLikeBtn">
        <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        ${(road.likes || 0) + (isLiked ? 1 : 0)}
      </button>
      <button class="rd-drive-btn" id="rdDriveBtn">Open in Map</button>
    </div>
  `);

  return rows.join('');
}

function bindDetailActions() {
  document.getElementById('rdLikeBtn')?.addEventListener('click', async () => {
    if (!currentRoad) return;
    liked = !liked;
    rdBody.innerHTML = buildDetailBody(currentRoad, liked);
    bindDetailActions();
    try {
      await fetch(`${API}/api/roads/${currentRoad.id}/like`, { method: 'POST' });
    } catch {}
  });

  document.getElementById('rdDriveBtn')?.addEventListener('click', () => {
    if (!currentRoad) return;
    const q = encodeURIComponent(currentRoad.name + (currentRoad.region ? ` ${currentRoad.region}` : ''));
    window.open(`https://maps.google.com/?q=${q}`, '_blank');
  });
}

document.getElementById('rdClose').addEventListener('click', closeDetail);
overlay.addEventListener('click', e => { if (e.target === overlay) closeDetail(); });
function closeDetail() {
  overlay.classList.remove('open');
  currentRoad = null;
}

/* ── Theme toggle ─── */
const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme');
if (savedTheme) root.setAttribute('data-theme', savedTheme);

themeToggle?.addEventListener('click', () => {
  const cur = root.getAttribute('data-theme');
  const next = cur === 'light' ? 'dark' : 'light';
  root.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

/* ── Helpers ─── */
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

loadRoads();
