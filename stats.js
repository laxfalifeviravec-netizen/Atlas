/* ============================================================
   Atlas — Drive Stats Page
   Depends on: roads-data.js (ROADS), config.js (db)
   ============================================================ */

// ── Theme ──────────────────────────────────────────────────────
const themeToggle = document.getElementById('themeToggle');
const savedTheme  = localStorage.getItem('atlas-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle?.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('atlas-theme', next);
});

// ── Navbar scroll ──────────────────────────────────────────────
const navbar    = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
window.addEventListener('scroll', () => navbar?.classList.toggle('scrolled', window.scrollY > 10), { passive: true });
navToggle?.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.classList.toggle('active', open);
  navToggle.setAttribute('aria-expanded', open);
});

// ── Type colors (mirrors map.js) ───────────────────────────────
const TYPE_COLORS = {
  Mountain:  '#6366f1',
  Coastal:   '#06b6d4',
  Scenic:    '#10b981',
  Technical: '#ef4444',
  Desert:    '#f59e0b',
  Historic:  '#8b5cf6',
  Canyon:    '#f97316',
  'Off-road':'#84cc16',
};

// ── Load drive data from localStorage ─────────────────────────
const drivenSet  = new Set(JSON.parse(localStorage.getItem('atlas-driven')      || '[]'));
const drivenMeta = JSON.parse(localStorage.getItem('atlas-driven-meta') || '{}');
const bucketArr  = JSON.parse(localStorage.getItem('atlas-bucket')      || '[]');

// ── Derived stats ──────────────────────────────────────────────
const totalRoads  = ROADS.length;
const drivenRoads = ROADS.filter(r => drivenSet.has(r.name));
const totalMiles  = Object.values(drivenMeta).reduce((s, r) => s + (r.miles || 0), 0);
const statesSet   = new Set(drivenRoads.flatMap(r => r.state.split(' / ')));
const regionsSet  = new Set(drivenRoads.map(r => r.region));

// ── Helpers ────────────────────────────────────────────────────
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function diffBadge(d) {
  const cls = d.includes('Very') ? 'very' : d.includes('Challenging') ? 'hard' : d.includes('Moderate') ? 'mod' : '';
  return `<span class="diff-badge ${cls}">${esc(d)}</span>`;
}

// ── Render: top summary cards ──────────────────────────────────
function renderTopCards() {
  const el = document.getElementById('topCards');
  if (!el) return;
  const pct = totalRoads > 0 ? Math.round((drivenRoads.length / totalRoads) * 100) : 0;
  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-val">${drivenRoads.length}</div>
      <div class="stat-card-label">Roads Driven</div>
      <div class="stat-card-sub">${pct}% of ${totalRoads} on Atlas</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-val">${Math.round(totalMiles).toLocaleString()}</div>
      <div class="stat-card-label">Miles Logged</div>
      <div class="stat-card-sub">across all drives</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-val">${statesSet.size}</div>
      <div class="stat-card-label">States</div>
      <div class="stat-card-sub">explored so far</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-val">${bucketArr.length}</div>
      <div class="stat-card-label">Bucket List</div>
      <div class="stat-card-sub">roads left to drive</div>
    </div>
  `;
}

// ── Render: overall progress ───────────────────────────────────
function renderOverall() {
  const el = document.getElementById('overallSection');
  if (!el) return;
  const pct = totalRoads > 0 ? (drivenRoads.length / totalRoads) * 100 : 0;
  el.innerHTML = `
    <div class="stats-section-hdr">
      <h2 class="stats-section-title">Overall Progress</h2>
      <span class="stats-section-meta">${drivenRoads.length} of ${totalRoads} roads</span>
    </div>
    <div class="stats-overall-bar-wrap">
      <div class="stats-overall-bar" style="width:${pct}%"></div>
    </div>
    <div class="stats-overall-label">${pct.toFixed(1)}% of the Atlas road list conquered</div>
  `;
}

// ── Render: by region ──────────────────────────────────────────
function renderByRegion() {
  const el = document.getElementById('regionSection');
  if (!el) return;
  const allRegions = [...new Set(ROADS.map(r => r.region))];
  const rows = allRegions.map(region => {
    const total  = ROADS.filter(r => r.region === region).length;
    const driven = drivenRoads.filter(r => r.region === region).length;
    const pct    = total > 0 ? (driven / total) * 100 : 0;
    return { region, total, driven, pct };
  });
  el.innerHTML = `
    <div class="stats-section-hdr">
      <h2 class="stats-section-title">By Region</h2>
    </div>
    ${rows.map(r => `
      <div class="stats-bar-row">
        <div class="stats-bar-label">
          <span>${esc(r.region)}</span>
          <span class="stats-bar-count">${r.driven}/${r.total}</span>
        </div>
        <div class="stats-bar-track">
          <div class="stats-bar-fill" style="width:${r.pct}%;background:var(--color-primary)"></div>
        </div>
      </div>
    `).join('')}
  `;
}

// ── Render: by road type ───────────────────────────────────────
function renderByType() {
  const el = document.getElementById('typeSection');
  if (!el) return;
  const allTypes = [...new Set(ROADS.map(r => r.type))].sort();
  const rows = allTypes.map(type => {
    const total  = ROADS.filter(r => r.type === type).length;
    const driven = drivenRoads.filter(r => r.type === type).length;
    const pct    = total > 0 ? (driven / total) * 100 : 0;
    const color  = TYPE_COLORS[type] || 'var(--color-primary)';
    return { type, total, driven, pct, color };
  });
  el.innerHTML = `
    <div class="stats-section-hdr">
      <h2 class="stats-section-title">By Road Type</h2>
    </div>
    ${rows.map(r => `
      <div class="stats-bar-row">
        <div class="stats-bar-label">
          <span><span class="type-dot" style="background:${r.color}"></span>${esc(r.type)}</span>
          <span class="stats-bar-count">${r.driven}/${r.total}</span>
        </div>
        <div class="stats-bar-track">
          <div class="stats-bar-fill" style="width:${r.pct}%;background:${r.color}"></div>
        </div>
      </div>
    `).join('')}
  `;
}

// ── Render: drive log ──────────────────────────────────────────
function renderDriveLog() {
  const el = document.getElementById('logSection');
  if (!el) return;

  if (!drivenRoads.length) {
    el.innerHTML = `
      <div class="stats-section-hdr">
        <h2 class="stats-section-title">Drive Log</h2>
      </div>
      <div class="stats-empty">
        <div class="stats-empty-icon">🗺</div>
        <h3>No drives logged yet</h3>
        <p>Open a road popup on the <a href="map.html">map</a> and click <strong>+ Log Drive</strong></p>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="stats-section-hdr">
      <h2 class="stats-section-title">Drive Log</h2>
      <span class="stats-section-meta">${drivenRoads.length} road${drivenRoads.length !== 1 ? 's' : ''}</span>
    </div>
    <div class="drive-log-list">
      ${drivenRoads.map(road => {
        const color = TYPE_COLORS[road.type] || 'var(--color-primary)';
        const meta  = drivenMeta[road.name] || {};
        const miles = meta.miles || parseFloat(road.length) || 0;
        const milesLabel = miles > 0 ? Math.round(miles) + ' mi' : road.length;
        return `
          <div class="drive-log-item">
            <div class="drive-log-type-bar" style="background:${color}"></div>
            <div class="drive-log-info">
              <div class="drive-log-name">${esc(road.name)}</div>
              <div class="drive-log-meta">
                ${road.designation ? esc(road.designation) + ' &middot; ' : ''}${esc(road.state)} &middot; ${esc(road.type)}
              </div>
            </div>
            <div class="drive-log-stats">
              <div class="drive-log-miles">${esc(milesLabel)}</div>
              <div class="drive-log-difficulty">${esc(road.difficulty)}</div>
            </div>
            <a class="drive-log-map-btn"
               href="map.html?road=${encodeURIComponent(road.name)}&lat=${road.lat}&lng=${road.lng}"
               title="View on map">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
              </svg>
            </a>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ── Render: bucket list ────────────────────────────────────────
function renderBucketList() {
  const el = document.getElementById('bucketSection');
  if (!el) return;

  const bucketRoads = ROADS.filter(r => bucketArr.includes(r.name) && !drivenSet.has(r.name));

  if (!bucketRoads.length) {
    el.innerHTML = `
      <div class="stats-section-hdr">
        <h2 class="stats-section-title">Bucket List</h2>
      </div>
      <div class="stats-empty">
        <div class="stats-empty-icon">★</div>
        <h3>Bucket list is empty</h3>
        <p>Save roads from the <a href="map.html">map</a> to plan your next drive</p>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="stats-section-hdr">
      <h2 class="stats-section-title">Bucket List</h2>
      <span class="stats-section-meta">${bucketRoads.length} road${bucketRoads.length !== 1 ? 's' : ''} to drive</span>
    </div>
    <div class="bucket-grid">
      ${bucketRoads.map(road => {
        const color = TYPE_COLORS[road.type] || 'var(--color-primary)';
        return `
          <a class="bucket-card"
             href="map.html?road=${encodeURIComponent(road.name)}&lat=${road.lat}&lng=${road.lng}">
            <div class="bucket-card-top" style="border-top:3px solid ${color}">
              <div class="bucket-card-name">${esc(road.name)}</div>
              <div class="bucket-card-desg">${esc(road.designation || '')}</div>
            </div>
            <div class="bucket-card-meta">
              <span>${esc(road.state)}</span>
              <span>${esc(road.length)}</span>
            </div>
            <div class="bucket-card-type" style="color:${color}">${esc(road.type)}</div>
          </a>
        `;
      }).join('')}
    </div>
  `;
}

// ── Boot ───────────────────────────────────────────────────────
renderTopCards();
renderOverall();
renderByRegion();
renderByType();
renderDriveLog();
renderBucketList();
