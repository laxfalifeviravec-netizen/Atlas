/* ============================================================
   One Culture — Messages Page JS
   ============================================================ */

const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001' : '';

let token = localStorage.getItem('culture-token');
let currentUser = null;
let activeConvId = null;
let activeOther = null;
let pollTimer = null;
let lastMsgCount = 0;

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
  } catch {}
}

// ── Conversation list ──────────────────────────────────────────
async function loadConversations() {
  if (!token) { showAuthWall(); return; }
  const loading = document.getElementById('convLoading');
  const empty   = document.getElementById('convEmpty');
  const list    = document.getElementById('convList');

  loading.style.display = '';
  empty.style.display = 'none';
  list.innerHTML = '';

  try {
    const res = await fetch(`${API}/api/conversations`, { headers: { Authorization: `Bearer ${token}` } });
    const { conversations } = await res.json();
    loading.style.display = 'none';

    if (!conversations || conversations.length === 0) {
      empty.style.display = '';
      return;
    }

    conversations.forEach(conv => {
      const other = conv.other_user;
      if (!other) return;
      const init = other.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
      const avatar = other.avatar
        ? `<img src="${esc(other.avatar)}" alt="" />`
        : init;
      const hasUnread = conv.unread_count > 0;

      const row = document.createElement('div');
      row.className = 'conv-row';
      row.innerHTML = `
        <div class="conv-avatar">${avatar}</div>
        <div class="conv-info">
          <div class="conv-name">${esc(other.name)}</div>
          <div class="conv-preview ${hasUnread ? 'unread' : ''}">${esc(conv.last_message || 'Start the conversation…')}</div>
        </div>
        <div class="conv-meta">
          <div class="conv-time">${fmtTime(conv.updated_at)}</div>
          ${hasUnread ? '<div class="conv-unread-dot"></div>' : ''}
        </div>`;
      row.addEventListener('click', () => openChat(conv.id, other));
      list.appendChild(row);
    });
  } catch {
    loading.style.display = 'none';
    empty.style.display = '';
  }
}

// ── Chat view ──────────────────────────────────────────────────
function openChat(convId, other) {
  activeConvId = convId;
  activeOther  = other;

  const init = other.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const avatar = other.avatar ? `<img src="${esc(other.avatar)}" alt="" />` : init;

  document.getElementById('chatHeaderAvatar').innerHTML = avatar;
  document.getElementById('chatHeaderName').textContent = other.name;
  document.getElementById('chatMessages').innerHTML = '';
  document.getElementById('chatInput').value = '';
  lastMsgCount = 0;

  document.getElementById('convListView').style.display = 'none';
  document.getElementById('chatView').style.display = 'flex';

  loadMessages();
  clearInterval(pollTimer);
  pollTimer = setInterval(loadMessages, 3000);
}

function closeChat() {
  clearInterval(pollTimer);
  activeConvId = null;
  activeOther  = null;
  document.getElementById('chatView').style.display = 'none';
  document.getElementById('convListView').style.display = '';
  loadConversations();
}

document.getElementById('chatBackBtn').addEventListener('click', closeChat);

async function loadMessages() {
  if (!activeConvId) return;
  try {
    const res = await fetch(`${API}/api/conversations/${activeConvId}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const { messages } = await res.json();
    if (!messages) return;
    if (messages.length === lastMsgCount) return;
    lastMsgCount = messages.length;
    renderMessages(messages);
  } catch {}
}

function renderMessages(messages) {
  const container = document.getElementById('chatMessages');
  const wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 60;

  container.innerHTML = '';
  let lastDay = '';

  messages.forEach(msg => {
    const day = new Date(msg.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (day !== lastDay) {
      lastDay = day;
      const label = document.createElement('div');
      label.className = 'chat-day-label';
      label.textContent = day;
      container.appendChild(label);
    }

    const isMine = msg.sender_id === currentUser?.id;
    const sender = isMine ? currentUser : activeOther;
    const sInit = sender ? sender.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() : '?';
    const sAvatar = sender?.avatar ? `<img src="${esc(sender.avatar)}" alt="" />` : sInit;

    const wrap = document.createElement('div');
    wrap.className = `chat-bubble-wrap ${isMine ? 'mine' : 'theirs'}`;
    wrap.innerHTML = `
      <div class="chat-bubble-avatar">${sAvatar}</div>
      <div class="chat-bubble">${esc(msg.body)}</div>`;
    container.appendChild(wrap);
  });

  if (wasAtBottom || lastMsgCount <= 1) {
    container.scrollTop = container.scrollHeight;
  }
}

document.getElementById('chatForm').addEventListener('submit', async e => {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const body = input.value.trim();
  if (!body || !activeConvId) return;
  input.value = '';

  try {
    await fetch(`${API}/api/conversations/${activeConvId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body })
    });
    await loadMessages();
  } catch {}
});

// ── New DM modal ───────────────────────────────────────────────
const newDmOverlay = document.getElementById('newDmOverlay');
let suggestedContacts = []; // people the user follows

function closeDmModal() {
  newDmOverlay.classList.remove('open');
  document.body.style.overflow = '';
  document.getElementById('dmSearchInput').value = '';
}

document.getElementById('newDmBtn').addEventListener('click', async () => {
  if (!token) { showAuthWall(); return; }
  document.getElementById('dmSearchInput').value = '';
  document.getElementById('dmSectionLabel').textContent = 'Suggested';
  newDmOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  await loadSuggested();
  setTimeout(() => document.getElementById('dmSearchInput').focus(), 100);
});

document.getElementById('newDmClose').addEventListener('click', closeDmModal);
newDmOverlay.addEventListener('click', e => { if (e.target === newDmOverlay) closeDmModal(); });

async function loadSuggested() {
  const list = document.getElementById('dmContactList');
  const empty = document.getElementById('dmContactEmpty');
  list.innerHTML = '<div class="dm-loading"><div class="spinner"></div></div>';
  empty.style.display = 'none';
  try {
    const res = await fetch(`${API}/api/me/following`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) { renderContactList([]); return; }
    const { users = [] } = await res.json();
    suggestedContacts = users;
    renderContactList(users, 'No one to suggest yet. Follow people to message them easily.');
  } catch { renderContactList([]); }
}

let dmSearchTimer = null;
document.getElementById('dmSearchInput').addEventListener('input', () => {
  const q = document.getElementById('dmSearchInput').value.trim();
  clearTimeout(dmSearchTimer);
  document.getElementById('dmSectionLabel').textContent = q ? 'Results' : 'Suggested';
  if (!q) { renderContactList(suggestedContacts, 'No one to suggest yet.'); return; }
  dmSearchTimer = setTimeout(() => searchDmUsers(q), 280);
});

async function searchDmUsers(q) {
  const list = document.getElementById('dmContactList');
  list.innerHTML = '<div class="dm-loading"><div class="spinner"></div></div>';
  try {
    const res = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    const { users = [] } = await res.json();
    const filtered = users.filter(u => u.id !== currentUser?.id);
    renderContactList(filtered, `No results for "${q}"`);
  } catch { renderContactList([], 'Search failed — try again.'); }
}

function renderContactList(users, emptyMsg = '') {
  const list = document.getElementById('dmContactList');
  const empty = document.getElementById('dmContactEmpty');
  list.innerHTML = '';
  if (!users.length) {
    empty.textContent = emptyMsg;
    empty.style.display = emptyMsg ? '' : 'none';
    return;
  }
  empty.style.display = 'none';
  users.forEach(u => {
    const init = (u.name || '?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
    const avatarHtml = u.avatar ? `<img src="${esc(u.avatar)}" alt="" />` : init;
    const row = document.createElement('div');
    row.className = 'dm-contact-row';
    row.innerHTML = `
      <div class="conv-avatar dm-contact-avatar">${avatarHtml}</div>
      <div class="conv-info">
        <div class="conv-name">${esc(u.name)}</div>
        <div class="conv-preview">${esc(u.bio || 'Driver')}</div>
      </div>
      <button class="dm-contact-btn">Message</button>`;
    row.addEventListener('click', async () => {
      closeDmModal();
      await startConversation(u.id, { id: u.id, name: u.name, avatar: u.avatar || null });
    });
    list.appendChild(row);
  });
}

async function startConversation(userId, other) {
  try {
    const res = await fetch(`${API}/api/conversations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    const { conversation } = await res.json();
    openChat(conversation.id, other);
  } catch {}
}

// ── Start first DM button ──────────────────────────────────────
document.getElementById('startFirstDmBtn').addEventListener('click', () => {
  if (!token) { showAuthWall(); return; }
  document.getElementById('newDmBtn').click();
});

// ── Auth wall ──────────────────────────────────────────────────
const authWall = document.getElementById('authWall');
function showAuthWall() {
  authWall.classList.add('open');
  document.body.style.overflow = 'hidden';
}
document.getElementById('authWallClose').addEventListener('click', () => {
  authWall.classList.remove('open'); document.body.style.overflow = '';
});
authWall.addEventListener('click', e => {
  if (e.target === authWall) { authWall.classList.remove('open'); document.body.style.overflow = ''; }
});

// ── Deep link: ?conv=id ────────────────────────────────────────
async function checkDeepLink() {
  const params = new URLSearchParams(location.search);
  const convId = parseInt(params.get('conv'));
  const userId = parseInt(params.get('user'));
  if (userId && token && currentUser) {
    const name = params.get('name') || 'User';
    await startConversation(userId, { id: userId, name, avatar: null });
  } else if (convId && token) {
    const name = params.get('name') || 'User';
    openChat(convId, { id: parseInt(params.get('uid')||0), name, avatar: null });
  }
}

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (diffDays < 7)  return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

(async () => {
  await loadMe();
  if (!token) { showAuthWall(); return; }
  await loadConversations();
  await checkDeepLink();
})();
