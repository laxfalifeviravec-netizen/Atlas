/* ============================================================
   One Culture — Events Page JS
   ============================================================ */

const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001' : '';

let token = localStorage.getItem('culture-token');
let currentUser = null;

const savedTheme = localStorage.getItem('culture-theme');
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
document.getElementById('themeToggle').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('culture-theme', next);
});

async function loadMe() {
  if (!token) return;
  try {
    const res = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { token = null; localStorage.removeItem('culture-token'); return; }
    const d = await res.json(); currentUser = d.user;
    document.getElementById('newEventBtn').style.display = '';
    document.getElementById('createFirstEventBtn').style.display = '';
  } catch {}
}

// ── Load events ────────────────────────────────────────────────
async function loadEvents() {
  const loading = document.getElementById('eventsLoading');
  const empty   = document.getElementById('eventsEmpty');
  const list    = document.getElementById('eventsList');

  loading.style.display = '';
  empty.style.display = 'none';
  list.innerHTML = '';

  try {
    const res = await fetch(`${API}/api/events`);
    const { events } = await res.json();
    loading.style.display = 'none';

    if (!events || events.length === 0) {
      empty.style.display = '';
      return;
    }

    events.forEach(evt => {
      list.appendChild(buildEventCard(evt));
    });
  } catch {
    loading.style.display = 'none';
    empty.style.display = '';
  }
}

function buildEventCard(evt) {
  const d = new Date(evt.date);
  const isPast = d < new Date();
  const month = d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
  const day   = d.getDate();
  const time  = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  const card = document.createElement('div');
  card.className = 'evt-card';
  card.innerHTML = `
    <div class="evt-date-block">
      <div class="evt-date-month">${esc(month)}</div>
      <div class="evt-date-day">${day}</div>
      <div class="evt-date-time">${esc(time)}</div>
    </div>
    <div class="evt-info">
      <div class="evt-title">${esc(evt.title)}</div>
      ${evt.location ? `<div class="evt-location">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        ${esc(evt.location)}
      </div>` : ''}
      <div class="evt-meta">
        <span class="evt-going-count">${evt.rsvp_count || 0} going</span>
        ${evt.is_going ? '<span class="evt-badge">Going</span>' : ''}
        ${isPast ? '<span class="evt-badge past">Past</span>' : ''}
      </div>
    </div>`;

  card.addEventListener('click', () => openEventDetail(evt));
  return card;
}

// ── Event detail modal ─────────────────────────────────────────
const detailOverlay = document.getElementById('eventDetailOverlay');

async function openEventDetail(evt) {
  document.getElementById('evtDetailTitle').textContent = evt.title;

  const d = new Date(evt.date);
  const isPast = d < new Date();
  const dateStr = d.toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const timeStr = d.toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit' });

  let attendeesHtml = '';
  try {
    const res = await fetch(`${API}/api/events/${evt.id}/attendees`);
    const { attendees } = await res.json();
    if (attendees && attendees.length > 0) {
      attendeesHtml = `
        <div class="evt-attendees">
          <div class="evt-attendees-title">Going (${attendees.length})</div>
          <div class="evt-attendees-list">
            ${attendees.map(a => {
              const init = a.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
              const av = a.avatar ? `<img src="${esc(a.avatar)}" alt="" />` : init;
              return `<a href="profile.html?id=${a.id}" class="evt-attendee-chip">
                <div class="evt-attendee-avatar">${av}</div>
                ${esc(a.name.split(' ')[0])}
              </a>`;
            }).join('')}
          </div>
        </div>`;
    }
  } catch {}

  const canRsvp = !isPast && token;
  const isGoing = evt.is_going;

  document.getElementById('evtDetailBody').innerHTML = `
    <div class="evt-detail-date">${esc(dateStr)} at ${esc(timeStr)}</div>
    ${evt.location ? `<div class="evt-detail-location">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      ${esc(evt.location)}
    </div>` : ''}
    ${evt.description ? `<div class="evt-detail-desc">${esc(evt.description)}</div>` : ''}
    <div class="evt-detail-creator">Organised by <a href="profile.html?id=${evt.creator_id}" style="color:var(--c-accent);text-decoration:none">${esc(evt.creator_name||'Driver')}</a></div>
    ${canRsvp ? `<div class="evt-rsvp-row">
      <span class="evt-going-label">${evt.rsvp_count || 0} going</span>
      <button class="btn ${isGoing ? 'btn-outline' : 'btn-primary'} evt-rsvp-btn" id="rsvpBtn" data-id="${evt.id}" data-going="${isGoing ? '1' : '0'}">
        ${isGoing ? 'Can\'t go' : 'I\'m going!'}
      </button>
    </div>` : `<div class="evt-rsvp-row"><span class="evt-going-label">${evt.rsvp_count || 0} going${isPast ? ' — past event' : ''}</span></div>`}
    ${attendeesHtml}`;

  if (canRsvp) {
    document.getElementById('rsvpBtn').addEventListener('click', () => toggleRsvp(evt));
  }

  detailOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

async function toggleRsvp(evt) {
  if (!token) return;
  const btn = document.getElementById('rsvpBtn');
  btn.disabled = true;
  try {
    const res = await fetch(`${API}/api/events/${evt.id}/rsvp`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    evt.is_going   = data.going;
    evt.rsvp_count = (evt.rsvp_count || 0) + (data.going ? 1 : -1);
    detailOverlay.classList.remove('open');
    document.body.style.overflow = '';
    await loadEvents();
    openEventDetail(evt);
  } catch { btn.disabled = false; }
}

document.getElementById('evtDetailClose').addEventListener('click', () => {
  detailOverlay.classList.remove('open');
  document.body.style.overflow = '';
});
detailOverlay.addEventListener('click', e => {
  if (e.target === detailOverlay) { detailOverlay.classList.remove('open'); document.body.style.overflow = ''; }
});

// ── Create event modal ─────────────────────────────────────────
const createOverlay = document.getElementById('createEventOverlay');

function openCreateModal() {
  if (!token) return;
  document.getElementById('evtTitle').value = '';
  document.getElementById('evtDesc').value  = '';
  document.getElementById('evtDate').value  = '';
  document.getElementById('evtLocation').value = '';
  document.getElementById('evtError').textContent = '';
  createOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

document.getElementById('newEventBtn').addEventListener('click', openCreateModal);
document.getElementById('createFirstEventBtn').addEventListener('click', openCreateModal);

document.getElementById('createEventClose').addEventListener('click', () => {
  createOverlay.classList.remove('open'); document.body.style.overflow = '';
});
createOverlay.addEventListener('click', e => {
  if (e.target === createOverlay) { createOverlay.classList.remove('open'); document.body.style.overflow = ''; }
});

document.getElementById('saveEventBtn').addEventListener('click', async () => {
  const title    = document.getElementById('evtTitle').value.trim();
  const desc     = document.getElementById('evtDesc').value.trim();
  const dateVal  = document.getElementById('evtDate').value;
  const location = document.getElementById('evtLocation').value.trim();
  const errEl    = document.getElementById('evtError');

  document.getElementById('evtTitleError').textContent = '';
  document.getElementById('evtDateError').textContent  = '';
  errEl.textContent = '';

  let ok = true;
  if (!title) { document.getElementById('evtTitleError').textContent = 'Title is required.'; ok = false; }
  if (!dateVal) { document.getElementById('evtDateError').textContent = 'Date is required.'; ok = false; }
  if (!ok) return;

  const btn = document.getElementById('saveEventBtn');
  btn.disabled = true; btn.textContent = 'Creating…';

  try {
    const res = await fetch(`${API}/api/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc, date: new Date(dateVal).toISOString(), location })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Failed to create event.'; return; }
    createOverlay.classList.remove('open');
    document.body.style.overflow = '';
    await loadEvents();
  } catch { errEl.textContent = 'Network error.'; }
  finally { btn.disabled = false; btn.textContent = 'Create Event'; }
});

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

(async () => {
  await loadMe();
  await loadEvents();
})();
