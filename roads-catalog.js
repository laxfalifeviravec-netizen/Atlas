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

const DIFF = ['', 'Easy', 'Easy', 'Moderate', 'Hard', 'Expert'];
const PAGE = 40;
let shown = PAGE;
let query = '';

function normalise(r, curated) {
  return {
    key: curated ? `curated-${r.id}` : String(r.id),
    curated,
    id: r.id,
    name: r.name,
    region: curated ? [r.state, r.region].filter(Boolean).join(' · ') : (r.region || ''),
    difficulty: curated ? (DIFF[r.difficulty] || 'Moderate') : (r.difficulty || ''),
    description: r.description || '',
    length_mi: r.length_mi || null,
    type: r.type || '',
    best_season: r.best_season || '',
    surface: r.surface || '',
    tip: r.tip || '',
    likes: r.likes || 0,
  };
}

function buildCard(road) {
  const card = document.createElement('div');
  card.className = 'rc-card';
  const meta = [road.length_mi ? `${road.length_mi} mi` : '', road.type].filter(Boolean).join(' · ');
  card.innerHTML = `
    <div class="rc-card-top">
      <div class="rc-card-name">${esc(road.name)}</div>
      ${road.difficulty ? `<span class="rc-diff-badge ${diffClass(road.difficulty)}">${esc(road.difficulty)}</span>` : ''}
    </div>
    ${road.region ? `<div class="rc-card-region">${esc(road.region)}</div>` : ''}
    ${road.description ? `<div class="rc-card-desc">${esc(road.description)}</div>` : ''}
    <div class="rc-card-footer">
      ${meta ? `<span class="rc-card-stat">${esc(meta)}</span>` : ''}
      ${road.curated ? '' : `<span class="rc-card-stat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        ${road.likes}</span><span class="rc-card-stat rc-community">Community</span>`}
    </div>
  `;
  card.addEventListener('click', () => openDetail(road));
  return card;
}

function render(roads) {
  grid.innerHTML = '';
  document.getElementById('rcCount').textContent = roads.length ? `${roads.length} road${roads.length === 1 ? '' : 's'}` : '';
  if (!roads.length) {
    empty.style.display = 'flex';
    document.getElementById('rcMore').style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  roads.slice(0, shown).forEach(r => grid.appendChild(buildCard(r)));
  document.getElementById('rcMore').style.display = roads.length > shown ? '' : 'none';
}

async function loadRoads() {
  const [community, curated] = await Promise.all([
    fetch(`${API}/api/roads`).then(r => r.json()).catch(() => ({})),
    fetch(`${API}/api/roads/curated`).then(r => r.json()).catch(() => ({})),
  ]);
  const c1 = Array.isArray(community) ? community : (community.roads || []);
  const c2 = Array.isArray(curated) ? curated : (curated.roads || []);
  allRoads = [
    ...c1.filter(r => r.point_type !== 'waypoint').map(r => normalise(r, false)),
    ...c2.map(r => normalise(r, true)),
  ];
  loading.style.display = 'none';
  applyFilter();
}

function applyFilter() {
  const q = query.trim().toLowerCase();
  const filtered = allRoads.filter(r =>
    (!activeDiff || r.difficulty.toLowerCase() === activeDiff.toLowerCase()) &&
    (!q || `${r.name} ${r.region} ${r.type}`.toLowerCase().includes(q)));
  render(filtered);
}

document.getElementById('rcFilters').addEventListener('click', e => {
  const chip = e.target.closest('.rc-chip');
  if (!chip) return;
  document.querySelectorAll('.rc-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  activeDiff = chip.dataset.diff || '';
  shown = PAGE;
  applyFilter();
});
let searchTimer;
document.getElementById('rcSearch').addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { query = e.target.value; shown = PAGE; applyFilter(); }, 150);
});
document.getElementById('rcMore').addEventListener('click', () => { shown += PAGE; applyFilter(); });

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
  const row = (label, value) => { if (value) rows.push(`<div class="rd-section-label">${label}</div><div class="rd-value">${esc(value)}</div>`); };
  row('Where', road.region);
  if (road.difficulty) {
    rows.push(`<div class="rd-section-label">Difficulty</div>
      <div class="rd-tags"><span class="rc-diff-badge ${diffClass(road.difficulty)}">${esc(road.difficulty)}</span></div>`);
  }
  row('Length', road.length_mi ? `${road.length_mi} miles` : '');
  row('Best season', road.best_season);
  row('About', road.description);
  row('Local tip', road.tip);
  rows.push(`
    <div class="rd-like-row">
      ${road.curated ? '' : `<button class="rd-like-btn${isLiked ? ' liked' : ''}" id="rdLikeBtn">
        <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        ${road.likes + (isLiked ? 1 : 0)}
      </button>`}
      <a class="rd-drive-btn" href="roads.html?road=${encodeURIComponent(road.key)}">Open in Map</a>
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
const savedTheme = localStorage.getItem('culture-theme');
if (savedTheme) root.setAttribute('data-theme', savedTheme);

themeToggle?.addEventListener('click', () => {
  const cur = root.getAttribute('data-theme');
  const next = cur === 'light' ? 'dark' : 'light';
  root.setAttribute('data-theme', next);
  localStorage.setItem('culture-theme', next);
});

/* ── Helpers ─── */
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

loadRoads();
