/* ============================================================
   Atlas — Notifications Bell
   Included after auth.js on any page that wants the bell.
   ============================================================ */

(function () {
  // ── Inject bell button into .nav-auth ────────────────────────
  function injectBell() {
    const navAuth = document.querySelector('.nav-auth');
    if (!navAuth || document.getElementById('notifBell')) return;

    const wrap = document.createElement('div');
    wrap.className = 'notif-wrap';
    wrap.id = 'notifWrap';
    wrap.innerHTML = `
      <button class="notif-bell" id="notifBell" aria-label="Notifications" style="display:none">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span class="notif-badge hidden" id="notifBadge"></span>
      </button>
      <div class="notif-dropdown hidden" id="notifDropdown">
        <div class="notif-dropdown-header">
          <span>Notifications</span>
          <button class="notif-mark-read" id="notifMarkRead">Mark all read</button>
        </div>
        <div class="notif-list" id="notifList">
          <p class="notif-empty">No notifications</p>
        </div>
      </div>
    `;
    navAuth.insertBefore(wrap, navAuth.firstChild);

    document.getElementById('notifBell')     .addEventListener('click', toggleDropdown);
    document.getElementById('notifMarkRead') .addEventListener('click', markAllRead);
    document.addEventListener('click', e => {
      const wrap = document.getElementById('notifWrap');
      if (wrap && !wrap.contains(e.target)) closeDropdown();
    });
  }

  function toggleDropdown() {
    const dd = document.getElementById('notifDropdown');
    if (!dd) return;
    const open = dd.classList.toggle('hidden');
    if (!open) loadNotifications();
  }
  function closeDropdown() {
    document.getElementById('notifDropdown')?.classList.add('hidden');
  }

  // ── Load & render ────────────────────────────────────────────
  let _userId = null;

  async function loadNotifications() {
    if (!_userId) return;
    const list = document.getElementById('notifList');
    if (!list) return;
    list.innerHTML = '<div style="padding:0.75rem;text-align:center;font-size:0.8rem;color:var(--color-text-muted)">Loading…</div>';
    try {
      const notifs = await notificationsGet(_userId);
      if (!notifs.length) {
        list.innerHTML = '<p class="notif-empty">No notifications yet</p>';
        return;
      }
      list.innerHTML = '';
      notifs.forEach(n => {
        const item = document.createElement('div');
        item.className = 'notif-item' + (n.read ? '' : ' unread');
        item.innerHTML = notifText(n);
        if (n.post_id) item.style.cursor = 'pointer';
        list.appendChild(item);
      });
    } catch {
      list.innerHTML = '<p class="notif-empty">Could not load notifications.</p>';
    }
  }

  function notifText(n) {
    const actor = n.actor?.full_name || n.actor?.username || 'Someone';
    const safe  = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const ts    = timeAgoNotif(n.created_at);
    let msg = '';
    if (n.type === 'like')       msg = `<b>${safe(actor)}</b> liked your post`;
    if (n.type === 'comment')    msg = `<b>${safe(actor)}</b> commented on your post`;
    if (n.type === 'group_join') msg = `<b>${safe(actor)}</b> joined <b>${safe(n.driving_groups?.name)}</b>`;
    return `<div class="notif-text">${msg}</div><div class="notif-time">${ts}</div>`;
  }

  function timeAgoNotif(ts) {
    const diff = (Date.now() - new Date(ts)) / 1000;
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  }

  async function refreshBadge() {
    if (!_userId) return;
    try {
      const count = await notificationsUnreadCount(_userId);
      const badge = document.getElementById('notifBadge');
      if (!badge) return;
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    } catch { /* silent */ }
  }

  async function markAllRead() {
    if (!_userId) return;
    try {
      await notificationsMarkRead(_userId);
      document.getElementById('notifBadge')?.classList.add('hidden');
      document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
    } catch { /* silent */ }
  }

  // ── Auth listener ────────────────────────────────────────────
  document.addEventListener('atlas:authchange', ({ detail: { user } }) => {
    const bell = document.getElementById('notifBell');
    if (user) {
      _userId = user.id;
      if (bell) bell.style.display = '';
      refreshBadge();
      // Poll every 60s
      clearInterval(window._notifPoll);
      window._notifPoll = setInterval(refreshBadge, 60000);
    } else {
      _userId = null;
      if (bell) bell.style.display = 'none';
      document.getElementById('notifBadge')?.classList.add('hidden');
      clearInterval(window._notifPoll);
    }
  });

  // Run inject immediately (DOM already parsed since this script is at end of body)
  injectBell();
})();
