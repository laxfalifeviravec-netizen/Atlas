const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001' : '';

let me = null;
let token = null;
let pollTimer = null;
let activeConvId = null;
let activeConvName = '';

const params = new URLSearchParams(location.search);

/* ── Auth ─── */
function getToken() {
  try { return localStorage.getItem('culture-token'); } catch { return null; }
}
async function getMe() {
  token = getToken();
  if (!token) return null;
  try {
    const r = await fetch(`${API}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

/* ── Tab switching ─── */
const chatTabs = document.getElementById('chatTabs');
const tabMessages = document.getElementById('tabMessages');
const tabGroups = document.getElementById('tabGroups');

chatTabs.addEventListener('click', e => {
  const tab = e.target.closest('.chat-tab');
  if (!tab) return;
  document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  const which = tab.dataset.tab;
  tabMessages.style.display = which === 'messages' ? '' : 'none';
  tabGroups.style.display   = which === 'groups'   ? '' : 'none';
  if (which === 'groups') loadGroups();
});

/* ── Messages tab ─── */
async function loadConversations() {
  const loading = document.getElementById('msgsLoading');
  const empty   = document.getElementById('msgsEmpty');
  const list    = document.getElementById('msgsList');
  if (!me) {
    loading.style.display = 'none';
    empty.style.display   = 'flex';
    return;
  }
  try {
    const r = await fetch(`${API}/api/conversations`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json();
    const convs = Array.isArray(data) ? data : [];
    loading.style.display = 'none';
    if (!convs.length) { empty.style.display = 'flex'; return; }
    empty.style.display = 'none';
    list.style.display  = '';
    list.innerHTML = convs.map(c => buildConvRow(c)).join('');
    list.querySelectorAll('.chat-list-item').forEach((el, i) => {
      el.addEventListener('click', () => openConv(convs[i].id, convs[i].other_user_name || convs[i].name || 'Chat'));
    });
  } catch {
    loading.style.display = 'none';
    empty.style.display   = 'flex';
  }
}

function buildConvRow(c) {
  const name  = esc(c.other_user_name || c.name || 'Unknown');
  const init  = (name[0] || '?').toUpperCase();
  const preview = esc(c.last_message || '');
  const time    = c.last_message_at ? relTime(c.last_message_at) : '';
  const unread  = c.unread_count > 0;
  return `
    <div class="chat-list-item" data-id="${c.id}">
      <div class="chat-avatar">${init}</div>
      <div class="chat-item-body">
        <div class="chat-item-name">${name}</div>
        ${preview ? `<div class="chat-item-preview">${preview}</div>` : ''}
      </div>
      <div class="chat-item-meta">
        ${time ? `<span class="chat-item-time">${time}</span>` : ''}
        ${unread ? `<span class="chat-unread-dot"></span>` : ''}
      </div>
    </div>`;
}

/* ── Groups tab (uses /api/groups or falls back to empty) ─── */
async function loadGroups() {
  const loading = document.getElementById('grpsLoading');
  const empty   = document.getElementById('grpsEmpty');
  const list    = document.getElementById('grpsList');
  if (!me) {
    loading.style.display = 'none';
    empty.style.display   = 'flex';
    return;
  }
  try {
    const r = await fetch(`${API}/api/groups`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error();
    const data = await r.json();
    const groups = Array.isArray(data) ? data : [];
    loading.style.display = 'none';
    if (!groups.length) { empty.style.display = 'flex'; return; }
    empty.style.display = 'none';
    list.style.display  = '';
    list.innerHTML = groups.map(g => buildGroupRow(g)).join('');
    list.querySelectorAll('.chat-list-item').forEach((el, i) => {
      el.addEventListener('click', () => openConv(groups[i].id, groups[i].name || 'Group', true));
    });
  } catch {
    loading.style.display = 'none';
    empty.style.display   = 'flex';
  }
}

function buildGroupRow(g) {
  const name = esc(g.name || 'Group');
  const init = (name[0] || '?').toUpperCase();
  const preview = esc(g.last_message || '');
  const time    = g.last_message_at ? relTime(g.last_message_at) : '';
  return `
    <div class="chat-list-item" data-id="${g.id}">
      <div class="chat-avatar">${init}</div>
      <div class="chat-item-body">
        <div class="chat-item-name">${name}</div>
        ${preview ? `<div class="chat-item-preview">${preview}</div>` : ''}
      </div>
      <div class="chat-item-meta">
        ${time ? `<span class="chat-item-time">${time}</span>` : ''}
      </div>
    </div>`;
}

/* ── Conversation view ─── */
const convView   = document.getElementById('convView');
const convHeader = document.getElementById('convHeaderName');
const convMsgs   = document.getElementById('convMessages');
const convInput  = document.getElementById('convInput');
const convSend   = document.getElementById('convSendBtn');
const convBack   = document.getElementById('convBack');

async function openConv(convId, name, isGroup = false) {
  activeConvId   = convId;
  activeConvName = name;
  convHeader.textContent = name;
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

convBack.addEventListener('click', () => {
  closeConv();
  loadConversations();
});

async function loadMessages() {
  if (!activeConvId || !me) return;
  try {
    const r = await fetch(`${API}/api/conversations/${activeConvId}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    const msgs = Array.isArray(data) ? data : (data.messages || []);
    const atBottom = convMsgs.scrollHeight - convMsgs.scrollTop - convMsgs.clientHeight < 60;
    convMsgs.innerHTML = msgs.map(m => buildMsgBubble(m)).join('');
    if (atBottom || convMsgs.scrollTop === 0) scrollToBottom();
  } catch {}
}

function buildMsgBubble(m) {
  const mine   = m.sender_id === me.id;
  const bubble = esc(m.content || '');
  const sender = mine ? '' : `<div class="conv-msg-sender">${esc(m.sender_name || '')}</div>`;
  const time   = `<div class="conv-msg-time">${relTime(m.created_at)}</div>`;
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

convSend.addEventListener('click', sendMessage);
convInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(); });

function scrollToBottom() {
  convMsgs.scrollTop = convMsgs.scrollHeight;
}

function startPoll() {
  stopPoll();
  pollTimer = setInterval(() => { if (activeConvId) loadMessages(); }, 3000);
}
function stopPoll() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

/* ── New message modal ─── */
const newMsgOverlay = document.getElementById('newMsgOverlay');
const newMsgSearch  = document.getElementById('newMsgSearch');
const newMsgResults = document.getElementById('newMsgResults');

document.getElementById('newChatBtn').addEventListener('click', () => {
  newMsgSearch.value = '';
  newMsgResults.innerHTML = '';
  newMsgOverlay.classList.add('open');
  newMsgSearch.focus();
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
      openConv(data.id, u.name || u.username);
    } catch {}
  }), 300);
});

/* ── Create group modal ─── */
const newGrpOverlay  = document.getElementById('newGrpOverlay');
const newGrpSearch   = document.getElementById('newGrpSearch');
const newGrpResults  = document.getElementById('newGrpResults');
const newGrpSelected = document.getElementById('newGrpSelected');
const newGrpNameInp  = document.getElementById('newGrpName');
let selectedUsers = [];

document.getElementById('grpsEmptyNewBtn')?.addEventListener('click', openCreateGroup);
document.getElementById('newGrpClose').addEventListener('click', () => newGrpOverlay.classList.remove('open'));
newGrpOverlay.addEventListener('click', e => { if (e.target === newGrpOverlay) newGrpOverlay.classList.remove('open'); });

function openCreateGroup() {
  selectedUsers = [];
  newGrpNameInp.value = '';
  newGrpSearch.value  = '';
  newGrpResults.innerHTML  = '';
  newGrpSelected.innerHTML = '';
  newGrpOverlay.classList.add('open');
}

let grpSearchDebounce = null;
newGrpSearch.addEventListener('input', () => {
  clearTimeout(grpSearchDebounce);
  grpSearchDebounce = setTimeout(() => searchUsers(newGrpSearch.value.trim(), newGrpResults, u => {
    if (selectedUsers.find(x => x.id === u.id)) return;
    selectedUsers.push(u);
    renderGrpChips();
    newGrpSearch.value = '';
    newGrpResults.innerHTML = '';
  }), 300);
});

function renderGrpChips() {
  newGrpSelected.innerHTML = selectedUsers.map(u => `
    <div class="grp-chip" data-id="${u.id}">
      ${esc(u.name || u.username)}
      <button class="grp-chip-remove" data-id="${u.id}">&times;</button>
    </div>`).join('');
  newGrpSelected.querySelectorAll('.grp-chip-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedUsers = selectedUsers.filter(x => String(x.id) !== btn.dataset.id);
      renderGrpChips();
    });
  });
}

document.getElementById('newGrpCreate').addEventListener('click', async () => {
  const name = newGrpNameInp.value.trim();
  if (!name || selectedUsers.length === 0 || !me) return;
  try {
    const r = await fetch(`${API}/api/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, member_ids: selectedUsers.map(u => u.id) })
    });
    const data = await r.json();
    newGrpOverlay.classList.remove('open');
    openConv(data.id, name, true);
  } catch {}
});

/* ── User search helper ─── */
async function searchUsers(q, container, onSelect) {
  if (!q) { container.innerHTML = ''; return; }
  try {
    const r = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}&section=people`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    const data = await r.json();
    const people = data.people || data || [];
    container.innerHTML = people.slice(0, 8).map(u => `
      <div class="chat-user-row" data-id="${u.id}">
        <div class="chat-avatar" style="width:36px;height:36px;font-size:15px">${(u.name || u.username || '?')[0].toUpperCase()}</div>
        <div>
          <div class="chat-user-row-name">${esc(u.name || u.username)}</div>
          ${u.username ? `<div class="chat-user-row-handle">@${esc(u.username)}</div>` : ''}
        </div>
      </div>`).join('');
    container.querySelectorAll('.chat-user-row').forEach((el, i) => {
      el.addEventListener('click', () => onSelect(people[i]));
    });
  } catch {
    container.innerHTML = '';
  }
}

/* ── Deep link: ?user=id&name=name ─── */
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
    openConv(data.id, decodeURIComponent(userName || 'Chat'));
  } catch {}
}

/* ── Theme toggle ─── */
const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme');
if (savedTheme) root.setAttribute('data-theme', savedTheme);
themeToggle?.addEventListener('click', () => {
  const cur  = root.getAttribute('data-theme');
  const next = cur === 'light' ? 'dark' : 'light';
  root.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

/* ── Helpers ─── */
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function relTime(ts) {
  if (!ts) return '';
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60)   return 'now';
  if (diff < 3600) return `${Math.floor(diff/60)}m`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h`;
  return `${Math.floor(diff/86400)}d`;
}

/* ── Init ─── */
(async () => {
  me = await getMe();
  await loadConversations();
  await handleDeepLink();
  document.getElementById('msgsEmptyNewBtn')?.addEventListener('click', () => {
    newMsgSearch.value = '';
    newMsgResults.innerHTML = '';
    newMsgOverlay.classList.add('open');
    newMsgSearch.focus();
  });
})();
