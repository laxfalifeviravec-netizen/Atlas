const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001' : '';

let me = null;
let token = null;
let pollTimer = null;
let activeConvId = null;

const params = new URLSearchParams(location.search);

/* ── Auth ─── */
function getToken() {
  try { return localStorage.getItem('culture-token'); } catch { return null; }
}
async function getMe() {
  token = getToken();
  if (!token) return null;
  try {
    const r = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const data = await r.json();
    return data.user || data;
  } catch { return null; }
}

/* ── Tabs ─── */
const chatTabs   = document.getElementById('chatTabs');
const tabMessages = document.getElementById('tabMessages');
const tabGroups   = document.getElementById('tabGroups');
const headerTitle = document.getElementById('headerTitle');

chatTabs.addEventListener('click', e => {
  const tab = e.target.closest('.chat-tab');
  if (!tab) return;
  document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  const which = tab.dataset.tab;
  tabMessages.style.display = which === 'messages' ? '' : 'none';
  tabGroups.style.display   = which === 'groups'   ? '' : 'none';
  headerTitle.textContent   = which === 'groups' ? 'Groups' : 'Messages';
  if (which === 'groups') loadGroups();
});

/* ── Messages ─── */
async function loadConversations() {
  const loading = document.getElementById('msgsLoading');
  const empty   = document.getElementById('msgsEmpty');
  const list    = document.getElementById('msgsList');
  if (!me) { loading.style.display = 'none'; empty.style.display = 'flex'; return; }
  try {
    const r = await fetch(`${API}/api/conversations`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json();
    const convs = Array.isArray(data) ? data : (data.conversations || []);
    loading.style.display = 'none';
    if (!convs.length) { empty.style.display = 'flex'; return; }
    empty.style.display = 'none';
    list.style.display  = '';
    list.innerHTML = convs.map(c => buildConvRow(c)).join('');
    list.querySelectorAll('.chat-list-item').forEach((el, i) => {
      el.addEventListener('click', () => openConv(convs[i].id, convs[i].other_user_name || convs[i].name || 'Chat'));
    });
  } catch { loading.style.display = 'none'; empty.style.display = 'flex'; }
}

function buildConvRow(c) {
  const name    = esc(c.other_user_name || c.name || 'Unknown');
  const init    = (name[0] || '?').toUpperCase();
  const preview = esc(c.last_message || '');
  const time    = c.last_message_at ? relTime(c.last_message_at) : '';
  const unread  = c.unread_count > 0;
  return `
    <div class="chat-list-item">
      <div class="chat-avatar">${init}</div>
      <div class="chat-item-body">
        <div class="chat-item-name">${name}</div>
        ${preview ? `<div class="chat-item-preview">${preview}</div>` : '<div class="chat-item-preview">No messages yet</div>'}
      </div>
      <div class="chat-item-meta">
        ${time ? `<span class="chat-item-time">${time}</span>` : ''}
        ${unread ? `<span class="chat-unread-dot"></span>` : ''}
      </div>
    </div>`;
}

/* ── Groups ─── */
async function loadGroups() {
  const loading = document.getElementById('grpsLoading');
  const empty   = document.getElementById('grpsEmpty');
  const list    = document.getElementById('grpsList');
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const r = await fetch(`${API}/api/groups`, { headers });
    if (!r.ok) throw new Error();
    const data = await r.json();
    const groups = Array.isArray(data) ? data : (data.groups || []);
    loading.style.display = 'none';
    if (!groups.length) { empty.style.display = 'flex'; return; }
    empty.style.display = 'none';
    list.style.display  = '';
    list.innerHTML = groups.map(g => buildGroupRow(g)).join('');
    list.querySelectorAll('.chat-list-item').forEach(() => {
      // clicking navigates to the full groups page
    });
    list.querySelectorAll('.chat-list-item').forEach(el => {
      el.addEventListener('click', () => { location.href = 'groups.html'; });
    });
  } catch { loading.style.display = 'none'; empty.style.display = 'flex'; }
}

function buildGroupRow(g) {
  const name  = esc(g.name || 'Group');
  const init  = (name[0] || '?').toUpperCase();
  const count = g.member_count ? `${g.member_count} member${g.member_count === 1 ? '' : 's'}` : '';
  const sub   = [count, esc(g.meeting_point || '')].filter(Boolean).join(' · ');
  const badge = g.is_private
    ? `<span style="font-size:10px;padding:2px 7px;border-radius:99px;background:rgba(139,92,246,.15);color:#a78bfa;font-weight:600;letter-spacing:.03em">Private</span>`
    : '';
  return `
    <div class="chat-list-item">
      <div class="chat-avatar is-group">${init}</div>
      <div class="chat-item-body">
        <div class="chat-item-name" style="display:flex;align-items:center;gap:7px">${name}${badge}</div>
        ${sub ? `<div class="chat-item-sub">${sub}</div>` : ''}
        ${g.description ? `<div class="chat-item-sub" style="opacity:.7">${esc(g.description)}</div>` : ''}
      </div>
      <svg class="chat-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
    </div>`;
}

/* ── Conversation view ─── */
const convView  = document.getElementById('convView');
const convMsgs  = document.getElementById('convMessages');
const convInput = document.getElementById('convInput');
const convBack  = document.getElementById('convBack');

async function openConv(convId, name) {
  activeConvId = convId;
  document.getElementById('convHeaderName').textContent = name;
  const init = (name[0] || '?').toUpperCase();
  document.getElementById('convHeaderAvatar').textContent = init;
  convMsgs.innerHTML = '';
  convView.classList.add('open');
  await loadMessages();
  startPoll();
  convInput.focus();
}

function closeConv() {
  convView.classList.remove('open');
  activeConvId = null;
  stopPoll();
}

convBack.addEventListener('click', () => { closeConv(); loadConversations(); });

async function loadMessages() {
  if (!activeConvId || !me) return;
  try {
    const r = await fetch(`${API}/api/conversations/${activeConvId}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    const msgs = Array.isArray(data) ? data : (data.messages || []);
    const atBottom = convMsgs.scrollHeight - convMsgs.scrollTop - convMsgs.clientHeight < 80;
    convMsgs.innerHTML = msgs.map(m => buildMsgBubble(m)).join('');
    if (atBottom || convMsgs.scrollTop === 0) convMsgs.scrollTop = convMsgs.scrollHeight;
  } catch {}
}

function buildMsgBubble(m) {
  const mine   = m.sender_id === me?.id;
  const bubble = esc(m.content || m.body || '');
  const sender = (!mine && m.sender_name) ? `<div class="conv-msg-sender">${esc(m.sender_name)}</div>` : '';
  const time   = m.created_at ? `<div class="conv-msg-time">${relTime(m.created_at)}</div>` : '';
  return `
    <div class="conv-msg ${mine ? 'mine' : 'theirs'}">
      ${sender}
      <div class="conv-msg-bubble">${bubble}</div>
      ${time}
    </div>`;
}

async function sendMessage() {
  const text = convInput.value.trim();
  if (!text || !activeConvId || !me) return;
  convInput.value = '';
  try {
    await fetch(`${API}/api/conversations/${activeConvId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: text })
    });
    await loadMessages();
  } catch {}
}

document.getElementById('convSendBtn').addEventListener('click', sendMessage);
convInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(); });

function startPoll() { stopPoll(); pollTimer = setInterval(() => { if (activeConvId) loadMessages(); }, 3000); }
function stopPoll()  { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

/* ── New Message sheet ─── */
const newMsgOverlay = document.getElementById('newMsgOverlay');
const newMsgSearch  = document.getElementById('newMsgSearch');
const newMsgResults = document.getElementById('newMsgResults');

function openNewMsg() {
  newMsgSearch.value = '';
  newMsgResults.innerHTML = '';
  newMsgOverlay.classList.add('open');
  setTimeout(() => newMsgSearch.focus(), 200);
}

document.getElementById('newChatBtn').addEventListener('click', () => {
  const activeTab = document.querySelector('.chat-tab.active')?.dataset.tab;
  if (activeTab === 'groups') { if (!token) { location.href = 'groups.html'; return; } openCreateGroup(); }
  else openNewMsg();
});
document.getElementById('newMsgClose').addEventListener('click', () => newMsgOverlay.classList.remove('open'));
newMsgOverlay.addEventListener('click', e => { if (e.target === newMsgOverlay) newMsgOverlay.classList.remove('open'); });

let searchDebounce = null;
newMsgSearch.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => searchUsers(newMsgSearch.value.trim(), newMsgResults, async u => {
    newMsgOverlay.classList.remove('open');
    if (!me) return;
    try {
      const r = await fetch(`${API}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ participant_id: u.id })
      });
      const data = await r.json();
      openConv(data.id || data.conversation?.id, u.name || u.username);
    } catch {}
  }), 300);
});

/* ── Create Group sheet ─── */
const newGrpOverlay  = document.getElementById('newGrpOverlay');
const newGrpSearch   = document.getElementById('newGrpSearch');
const newGrpResults  = document.getElementById('newGrpResults');
const newGrpSelected = document.getElementById('newGrpSelected');
const newGrpNameInp  = document.getElementById('newGrpName');
const grpIconPreview = document.getElementById('grpIconPreview');
let selectedUsers = [];

function openCreateGroup() {
  selectedUsers = [];
  newGrpNameInp.value = '';
  newGrpSearch.value  = '';
  newGrpResults.innerHTML  = '';
  newGrpSelected.innerHTML = '';
  resetGrpIcon();
  newGrpOverlay.classList.add('open');
  setTimeout(() => newGrpNameInp.focus(), 200);
}

function resetGrpIcon() {
  grpIconPreview.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
}

newGrpNameInp.addEventListener('input', () => {
  const v = newGrpNameInp.value.trim();
  grpIconPreview.innerHTML = v ? esc(v[0].toUpperCase()) : '';
  if (!v) resetGrpIcon();
});

document.getElementById('grpsEmptyNewBtn')?.addEventListener('click', () => {
  if (!token) { location.href = 'groups.html'; return; }
  openCreateGroup();
});
document.getElementById('newGrpClose').addEventListener('click', () => newGrpOverlay.classList.remove('open'));
newGrpOverlay.addEventListener('click', e => { if (e.target === newGrpOverlay) newGrpOverlay.classList.remove('open'); });

let grpDebounce = null;
newGrpSearch.addEventListener('input', () => {
  clearTimeout(grpDebounce);
  grpDebounce = setTimeout(() => searchUsers(newGrpSearch.value.trim(), newGrpResults, u => {
    if (selectedUsers.find(x => x.id === u.id)) return;
    selectedUsers.push(u);
    renderGrpChips();
    newGrpSearch.value = '';
    newGrpResults.innerHTML = '';
  }), 300);
});

function renderGrpChips() {
  newGrpSelected.innerHTML = selectedUsers.map(u => {
    const n = esc(u.name || u.username || '?');
    const init = n[0].toUpperCase();
    return `
      <div class="grp-chip" data-id="${u.id}">
        <div class="grp-chip-avatar">${init}</div>
        ${n}
        <button class="grp-chip-remove" data-id="${u.id}">×</button>
      </div>`;
  }).join('');
  newGrpSelected.querySelectorAll('.grp-chip-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      selectedUsers = selectedUsers.filter(x => String(x.id) !== btn.dataset.id);
      renderGrpChips();
    });
  });
}

document.getElementById('newGrpCreate').addEventListener('click', async () => {
  const name = newGrpNameInp.value.trim();
  const errEl = document.getElementById('newGrpError');
  if (!name) { errEl.textContent = 'Enter a group name.'; return; }
  if (!token) { errEl.textContent = 'You must be signed in.'; return; }
  errEl.textContent = '';
  const btn = document.getElementById('newGrpCreate');
  btn.disabled = true; btn.textContent = 'Creating…';
  try {
    const r = await fetch(`${API}/api/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, member_ids: selectedUsers.map(u => u.id) })
    });
    const data = await r.json();
    if (!r.ok) { errEl.textContent = data.error || 'Failed to create group.'; return; }
    newGrpOverlay.classList.remove('open');
    await loadGroups();
    // Switch to groups tab to show the new group
    document.querySelector('[data-tab="groups"]')?.click();
  } catch { errEl.textContent = 'Network error — try again.'; }
  finally { btn.disabled = false; btn.textContent = 'Create Group'; }
});

/* ── User search helper ─── */
async function searchUsers(q, container, onSelect) {
  if (!q) { container.innerHTML = ''; return; }
  try {
    const r = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}&section=people`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    const data = await r.json();
    const people = data.people || (Array.isArray(data) ? data : []);
    container.innerHTML = people.slice(0, 8).map(u => `
      <div class="chat-user-row" data-id="${u.id}">
        <div class="chat-avatar" style="width:38px;height:38px;font-size:16px;flex-shrink:0">${(u.name || u.username || '?')[0].toUpperCase()}</div>
        <div>
          <div class="chat-user-row-name">${esc(u.name || u.username)}</div>
          ${u.username ? `<div class="chat-user-row-handle">@${esc(u.username)}</div>` : ''}
        </div>
      </div>`).join('');
    container.querySelectorAll('.chat-user-row').forEach((el, i) => {
      el.addEventListener('click', () => onSelect(people[i]));
    });
  } catch { container.innerHTML = ''; }
}

/* ── Deep link ─── */
async function handleDeepLink() {
  const userId   = params.get('user');
  const userName = params.get('name');
  if (!userId || !me) return;
  try {
    const r = await fetch(`${API}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ participant_id: userId })
    });
    const data = await r.json();
    openConv(data.id || data.conversation?.id, decodeURIComponent(userName || 'Chat'));
  } catch {}
}

/* ── Theme ─── */
const savedTheme = localStorage.getItem('culture-theme') || localStorage.getItem('theme');
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
document.getElementById('themeToggle')?.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('culture-theme', next);
});

/* ── Helpers ─── */
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function relTime(ts) {
  if (!ts) return '';
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60)    return 'now';
  if (diff < 3600)  return `${Math.floor(diff/60)}m`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h`;
  return `${Math.floor(diff/86400)}d`;
}

/* ── Init ─── */
(async () => {
  me = await getMe();
  await loadConversations();
  await handleDeepLink();
  document.getElementById('msgsEmptyNewBtn')?.addEventListener('click', openNewMsg);
})();
