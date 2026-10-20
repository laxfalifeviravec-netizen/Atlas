/* One Culture — Reels */
const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3001' : '';
const token = localStorage.getItem('culture-token');
let currentUser = null;

const scroller = document.getElementById('reelsScroll');
const emptyEl = document.getElementById('reelsEmpty');
let reels = [];
let includeSeen = false;
let endShown = false;
let loading = false;
let exhausted = false;
let activeIdx = -1;
let muted = true;
let observer = null;

const ICON = {
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="24" height="24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="24" height="24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
};

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function authHeaders(json) {
  const h = {};
  if (token) h.Authorization = `Bearer ${token}`;
  if (json) h['Content-Type'] = 'application/json';
  return h;
}
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'reels-toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
function requireLogin() {
  if (token) return true;
  location.href = 'index.html';
  return false;
}
function fmtCount(n) {
  n = n || 0;
  return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n);
}

// ── Sheets ─────────────────────────────────────────────────
function openSheet(html) {
  const ov = document.createElement('div');
  ov.className = 'rs-ov';
  ov.innerHTML = `<div class="rs-box">${html}</div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('open'));
  const close = () => { ov.classList.remove('open'); setTimeout(() => ov.remove(), 250); };
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  return { ov, box: ov.firstElementChild, close };
}

function actionSheet(title, items) {
  const { box, close } = openSheet(`
    ${title ? `<div class="rs-title">${esc(title)}</div>` : ''}
    ${items.map((it, i) => `<button class="rs-item${it.danger ? ' danger' : ''}" data-i="${i}">${esc(it.label)}</button>`).join('')}
    <button class="rs-cancel">Cancel</button>`);
  box.querySelectorAll('.rs-item').forEach(b => b.addEventListener('click', () => { close(); items[+b.dataset.i].fn(); }));
  box.querySelector('.rs-cancel').addEventListener('click', close);
}

// ── Data ───────────────────────────────────────────────────
async function loadMe() {
  if (!token) return;
  try {
    const r = await fetch(`${API}/api/auth/me`, { headers: authHeaders() });
    if (r.ok) currentUser = (await r.json()).user;
  } catch {}
}

async function loadMore() {
  if (loading || exhausted) return;
  loading = true;
  try {
    const params = new URLSearchParams({ limit: '6' });
    if (includeSeen) params.set('include_seen', '1');
    if (reels.length) params.set('exclude', reels.map(r => r.id).slice(-300).join(','));
    const r = await fetch(`${API}/api/reels?${params}`, { headers: authHeaders() });
    const data = await r.json();
    const have = new Set(reels.map(x => x.id));
    const fresh = (data.reels || []).filter(x => !have.has(x.id));
    if (!data.more) exhausted = true;
    reels.push(...fresh);
    fresh.forEach(r2 => appendReel(r2));
    if (exhausted) showEnd(data.seen_hidden > 0);
  } catch {}
  loading = false;
  emptyEl.style.display = (reels.length || endShown) ? 'none' : 'flex';
}

// Final card once every roller has been watched
function showEnd(hasSeen) {
  if (endShown || (!reels.length && !hasSeen)) return;
  endShown = true;
  const el = document.createElement('section');
  el.className = 'reel reel-end';
  el.innerHTML = `
    <div class="reel-end-inner">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="44" height="44"><polyline points="20 6 9 17 4 12"/></svg>
      <h2>You're all caught up</h2>
      <p>You've watched all the new rollers. Check back soon.</p>
      ${includeSeen ? '' : '<button class="btn btn-outline" id="watchSeenBtn">Watch ones I\'ve already seen</button>'}
    </div>`;
  scroller.appendChild(el);
  el.querySelector('#watchSeenBtn')?.addEventListener('click', () => {
    includeSeen = true; exhausted = false; endShown = false; el.remove(); loadMore();
  });
}

// ── Seen tracking ──────────────────────────────────────────
const seenQueue = new Set();
let seenFlushTimer = null;
let seenTimer = null;
function queueSeen(id) {
  if (!token) return;
  seenQueue.add(id);
  clearTimeout(seenFlushTimer);
  seenFlushTimer = setTimeout(flushSeen, 2500);
}
function flushSeen() {
  if (!seenQueue.size || !token) return;
  const ids = [...seenQueue]; seenQueue.clear();
  fetch(`${API}/api/seen`, { method: 'POST', keepalive: true, headers: authHeaders(true), body: JSON.stringify({ post_ids: ids }) }).catch(() => {});
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSeen(); });
window.addEventListener('pagehide', flushSeen);

// ── Rendering ──────────────────────────────────────────────
function appendReel(r) {
  const el = buildReel(r);
  scroller.appendChild(el);
  observer.observe(el);
}

function buildReel(r) {
  const init = (r.user_name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const av = r.user_avatar ? `<img src="${esc(r.user_avatar)}" alt="" />` : init;
  const el = document.createElement('section');
  el.className = 'reel';
  el.dataset.id = r.id;
  el._reel = r;
  el.innerHTML = `
    <video class="reel-video" playsinline loop muted preload="none"></video>
    <div class="reel-shade"></div>
    <div class="reel-flash heart">${ICON.heart}</div>
    <div class="reel-flash pp"></div>
    <div class="reel-rail">
      <a class="reel-avatar" href="profile.html?id=${r.user_id}" aria-label="Profile">${av}</a>
      <button class="reel-act like${r.liked ? ' liked' : ''}" aria-label="Like">${ICON.heart}<span>${fmtCount(r.likes)}</span></button>
      <button class="reel-act comment" aria-label="Comments">${ICON.comment}<span>${fmtCount(r.comments)}</span></button>
      <button class="reel-act share" aria-label="Share">${ICON.share}<span>Share</span></button>
      <button class="reel-act more" aria-label="More">${ICON.more}</button>
    </div>
    <div class="reel-info">
      <a class="reel-user" href="profile.html?id=${r.user_id}">@${esc(r.user_name || 'driver')}</a>
      ${r.caption ? `<p class="reel-cap">${esc(r.caption)}</p>` : ''}
    </div>
    <div class="reel-progress"><i></i></div>`;

  const video = el.querySelector('video');
  video.dataset.src = r.image_url.startsWith('http') ? r.image_url : `${API}${r.image_url}`;
  video.addEventListener('loadedmetadata', () => { if (video.videoWidth > video.videoHeight) video.classList.add('wide'); });
  video.addEventListener('timeupdate', () => {
    if (video.duration) el.querySelector('.reel-progress i').style.width = `${(video.currentTime / video.duration) * 100}%`;
  });

  let lastTap = 0, tapTimer = null;
  el.addEventListener('click', e => {
    if (e.target.closest('.reel-rail, .reel-info a, a, button')) return;
    const now = Date.now();
    if (now - lastTap < 300) { clearTimeout(tapTimer); lastTap = 0; likeReel(el, true); return; }
    lastTap = now;
    tapTimer = setTimeout(() => togglePlay(el), 300);
  });
  const cap = el.querySelector('.reel-cap');
  if (cap) cap.addEventListener('click', () => cap.classList.toggle('open'));
  el.querySelector('.like').addEventListener('click', () => likeReel(el, false));
  el.querySelector('.comment').addEventListener('click', () => openComments(el));
  el.querySelector('.share').addEventListener('click', () => openShare(el));
  el.querySelector('.more').addEventListener('click', () => openMore(el));
  return el;
}

function flash(el, kind, svg) {
  const f = el.querySelector(kind === 'heart' ? '.reel-flash.heart' : '.reel-flash.pp');
  if (svg) f.innerHTML = svg;
  f.classList.remove('show'); void f.offsetWidth; f.classList.add('show');
}

function togglePlay(el) {
  const v = el.querySelector('video');
  if (v.paused) { v.play().catch(() => {}); flash(el, 'pp', ICON.play); }
  else { v.pause(); flash(el, 'pp', ICON.pause); }
}

// ── Playback ───────────────────────────────────────────────
function setMuted(m) {
  muted = m;
  document.getElementById('muteBtn').innerHTML = m ? ICON.soundOff : ICON.soundOn;
  document.querySelectorAll('.reel video').forEach(v => { v.muted = m; });
}

function loadWindow(idx) {
  const els = scroller.children;
  for (let i = 0; i < els.length; i++) {
    const v = els[i].querySelector('video');
    if (!v) continue;
    if (Math.abs(i - idx) <= 1) {
      if (!v.getAttribute('src')) { v.src = v.dataset.src; v.preload = 'auto'; }
    } else if (v.getAttribute('src')) {
      v.pause(); v.removeAttribute('src'); v.load();
    }
  }
}

function setActive(idx) {
  if (idx === activeIdx) return;
  const prev = scroller.children[activeIdx];
  if (prev && prev.querySelector('video')) prev.querySelector('video').pause();
  activeIdx = idx;
  loadWindow(idx);
  const el = scroller.children[idx];
  if (!el) return;
  const v = el.querySelector('video');
  if (!v) return;
  clearTimeout(seenTimer);
  seenTimer = setTimeout(() => queueSeen(el._reel.id), 1500);
  v.muted = muted;
  v.currentTime = 0;
  v.play().catch(() => {
    if (!v.muted) { setMuted(true); v.play().catch(() => {}); }
  });
  if (idx >= reels.length - 3) loadMore();
}

function initObserver() {
  observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio >= 0.6) {
        setActive(Array.prototype.indexOf.call(scroller.children, e.target));
      }
    });
  }, { root: scroller, threshold: [0.6] });
}

// ── Actions ────────────────────────────────────────────────
async function likeReel(el, fromDoubleTap) {
  if (!requireLogin()) return;
  const r = el._reel;
  if (fromDoubleTap) flash(el, 'heart');
  if (fromDoubleTap && r.liked) return;
  try {
    const res = await fetch(`${API}/api/posts/${r.id}/like`, { method: 'POST', headers: authHeaders() });
    if (!res.ok) return;
    const d = await res.json();
    r.liked = d.liked; r.likes = d.likes;
    const btn = el.querySelector('.like');
    btn.classList.toggle('liked', d.liked);
    btn.querySelector('span').textContent = fmtCount(d.likes);
  } catch {}
}

async function openComments(el) {
  const r = el._reel;
  const { box } = openSheet(`
    <div class="rs-title">Comments</div>
    <div class="rs-list" id="rsComments"><div class="rs-empty">Loading…</div></div>
    <form class="rs-form" id="rsCommentForm">
      <input class="rs-input" id="rsCommentInput" placeholder="${token ? 'Add a comment…' : 'Sign in to comment'}" maxlength="300" autocomplete="off" ${token ? '' : 'disabled'} />
      <button class="rs-send" type="submit" ${token ? '' : 'disabled'}>Post</button>
    </form>`);
  const list = box.querySelector('#rsComments');
  const draw = comments => {
    list.innerHTML = comments.length
      ? comments.map(c => `<div class="rs-comment"><b>${esc(c.user_name || 'Driver')}</b>${esc(c.body)}</div>`).join('')
      : '<div class="rs-empty">No comments yet. Be the first.</div>';
  };
  let comments = [];
  try {
    const res = await fetch(`${API}/api/posts/${r.id}/comments`);
    comments = (await res.json()).comments || [];
  } catch {}
  draw(comments);
  box.querySelector('#rsCommentForm').addEventListener('submit', async e => {
    e.preventDefault();
    const input = box.querySelector('#rsCommentInput');
    const body = input.value.trim();
    if (!body) return;
    input.value = '';
    try {
      const res = await fetch(`${API}/api/posts/${r.id}/comments`, { method: 'POST', headers: authHeaders(true), body: JSON.stringify({ body }) });
      if (!res.ok) throw new Error();
      const { comment } = await res.json();
      comments.push(comment); draw(comments);
      list.scrollTop = list.scrollHeight;
      r.comments = (r.comments || 0) + 1;
      el.querySelector('.comment span').textContent = fmtCount(r.comments);
    } catch { toast('Could not post comment.'); }
  });
}

function reelLink(r) { return `${location.origin}/reels.html?id=${r.id}`; }

function openShare(el) {
  const r = el._reel;
  const items = [{ label: 'Share link', fn: async () => {
    const url = reelLink(r);
    try { if (navigator.share) { await navigator.share({ title: 'One Culture', url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); toast('Link copied!'); } catch { toast(url); }
  } }];
  if (token) items.unshift({ label: 'Send to a driver', fn: () => openSend(r) });
  actionSheet('Share this roller', items);
}

function openSend(r) {
  const { box, close } = openSheet(`
    <div class="rs-title">Send to a driver</div>
    <input class="rs-input" id="rsSearch" placeholder="Search drivers…" autocomplete="off" />
    <div class="rs-list" id="rsResults"></div>`);
  const input = box.querySelector('#rsSearch'), results = box.querySelector('#rsResults');
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (!q) { results.innerHTML = ''; return; }
    timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}`, { headers: authHeaders() });
        const { users = [] } = await res.json();
        results.innerHTML = users.length ? users.slice(0, 8).map(u => `
          <div class="rs-user" data-id="${u.id}" data-name="${esc(u.name)}">
            <div class="rs-user-av">${esc((u.name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase())}</div>
            <span class="rs-user-name">${esc(u.name)}</span><span class="rs-user-send">Send</span>
          </div>`).join('') : '<div class="rs-empty">No drivers found</div>';
        results.querySelectorAll('.rs-user').forEach(row => row.addEventListener('click', async () => {
          try {
            const cr = await fetch(`${API}/api/conversations`, { method: 'POST', headers: authHeaders(true), body: JSON.stringify({ user_id: row.dataset.id }) });
            const { conversation_id } = await cr.json();
            await fetch(`${API}/api/conversations/${conversation_id}/messages`, {
              method: 'POST', headers: authHeaders(true),
              body: JSON.stringify({ body: JSON.stringify({ __type: 'post_share', post_id: r.id, image_url: r.image_url, caption: r.caption || '', user_id: r.user_id, user_name: r.user_name || 'Driver', road_name: '' }) }),
            });
            close(); toast(`Sent to ${row.dataset.name}!`);
          } catch { toast('Could not send.'); }
        }));
      } catch {}
    }, 280);
  });
  setTimeout(() => input.focus(), 280);
}

function openMore(el) {
  const r = el._reel;
  const own = currentUser && String(r.user_id) === String(currentUser.id);
  const items = [{ label: 'Copy link', fn: async () => { try { await navigator.clipboard.writeText(reelLink(r)); toast('Link copied!'); } catch { toast(reelLink(r)); } } }];
  if (own || (currentUser && currentUser.is_admin)) items.push({ label: 'Delete roller', danger: true, fn: () => deleteReel(el) });
  if (!own) {
    items.push({ label: 'Report roller', danger: true, fn: () => reportReel(r) });
    items.push({ label: `Block ${r.user_name || 'user'}`, danger: true, fn: () => blockUser(r) });
  }
  actionSheet('', items);
}

async function deleteReel(el) {
  if (!(await appConfirm('Delete this roller? This cannot be undone.', 'Delete'))) return;
  const r = el._reel;
  try {
    const res = await fetch(`${API}/api/posts/${r.id}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) throw new Error();
    removeReels(x => x.id === r.id);
    toast('Roller deleted');
  } catch { toast('Could not delete.'); }
}

function reportReel(r) {
  if (!requireLogin()) return;
  const reasons = ['Spam or scam', 'Inappropriate or offensive', 'Harassment or hate', 'Dangerous driving', 'Something else'];
  actionSheet('Why are you reporting this roller?', reasons.map(reason => ({
    label: reason, fn: async () => {
      try {
        const res = await fetch(`${API}/api/report`, { method: 'POST', headers: authHeaders(true), body: JSON.stringify({ target_type: 'post', target_id: r.id, reason }) });
        toast(res.ok ? "Thanks — we'll review this roller." : 'Could not send report.');
      } catch { toast('Could not send report.'); }
    },
  })));
}

async function blockUser(r) {
  if (!requireLogin()) return;
  if (!(await appConfirm(`Block ${r.user_name || 'this user'}? You won't see their rollers and they can't message you.`, 'Block'))) return;
  try {
    const res = await fetch(`${API}/api/block/${r.user_id}`, { method: 'POST', headers: authHeaders() });
    if (!res.ok) throw new Error();
    removeReels(x => String(x.user_id) === String(r.user_id));
    toast('User blocked');
  } catch { toast('Could not block user.'); }
}

function removeReels(pred) {
  reels = reels.filter(r => !pred(r));
  Array.from(scroller.children).forEach(el => { if (el._reel && pred(el._reel)) { observer.unobserve(el); el.remove(); } });
  activeIdx = -1;
  const idx = Math.round(scroller.scrollTop / Math.max(1, scroller.clientHeight));
  if (scroller.children.length) setActive(Math.min(idx, scroller.children.length - 1));
  emptyEl.style.display = (reels.length || endShown) ? 'none' : 'flex';
}

// ── Upload ─────────────────────────────────────────────────
let limits = { max_mb: 50, max_seconds: 60 };
fetch(`${API}/api/reels/config`).then(r => r.json()).then(d => { if (d && d.max_mb) limits = d; }).catch(() => {});

function openUpload() {
  if (!requireLogin()) return;
  let file = null;
  const { box, close } = openSheet(`
    <div class="rs-title">New roller</div>
    <input type="file" id="rsFile" accept="video/*" style="display:none" />
    <div class="rs-pick" id="rsPick">Tap to choose or record a video<br><small>Up to ${limits.max_seconds} seconds and ${limits.max_mb} MB</small></div>
    <video class="rs-preview" id="rsPreview" playsinline muted controls style="display:none"></video>
    <input class="rs-input" id="rsCaption" placeholder="Write a caption…" maxlength="300" style="display:none" />
    <div class="rs-bar" id="rsBar" style="display:none"><i></i></div>
    <div class="rs-err" id="rsErr"></div>
    <button class="rs-primary" id="rsPost" disabled>Post roller</button>
    <button class="rs-cancel" id="rsCancel">Cancel</button>`);
  const $ = id => box.querySelector('#' + id);
  const fail = m => { $('rsErr').textContent = m; };
  $('rsCancel').addEventListener('click', close);
  $('rsPick').addEventListener('click', () => $('rsFile').click());
  $('rsFile').addEventListener('change', () => {
    const f = $('rsFile').files[0];
    if (!f) return;
    fail('');
    if (!f.type.startsWith('video/') && !/\.(mp4|mov|m4v|webm)$/i.test(f.name)) return fail('Please choose a video file.');
    if (f.size > limits.max_mb * 1048576) return fail(`That video is ${(f.size / 1048576).toFixed(0)} MB. The limit is ${limits.max_mb} MB. Trim it, or lower the video quality (Settings > Camera > Record Video) and try again.`);
    const url = URL.createObjectURL(f);
    const pv = $('rsPreview');
    pv.onloadedmetadata = () => {
      if (pv.duration > limits.max_seconds + 0.5) { fail(`That video is ${Math.round(pv.duration)} seconds. The limit is ${limits.max_seconds} seconds.`); return; }
      file = f;
      $('rsPick').style.display = 'none'; pv.style.display = 'block'; $('rsCaption').style.display = 'block';
      $('rsPost').disabled = false;
    };
    pv.onerror = () => fail("This phone can't preview that video format. Try a different clip.");
    pv.src = url;
  });
  $('rsPost').addEventListener('click', async () => {
    if (!file) return;
    $('rsPost').disabled = true; $('rsCancel').disabled = true; $('rsBar').style.display = 'block'; fail('');
    try {
      const reel = await uploadReel(file, $('rsCaption').value.trim(), p => { $('rsBar').firstElementChild.style.width = p + '%'; });
      close();
      reels.unshift(reel);
      scroller.insertBefore(buildReel(reel), scroller.firstChild);
      observer.observe(scroller.firstChild);
      activeIdx = -1; scroller.scrollTop = 0; setActive(0);
      emptyEl.style.display = 'none';
      toast('Roller posted!');
    } catch (e) {
      fail(e.message || 'Upload failed. Please try again.');
      $('rsPost').disabled = false; $('rsCancel').disabled = false; $('rsBar').style.display = 'none';
    }
  });
}

function uploadReel(file, caption, onProgress) {
  return window.uploadVideo(file, caption, token, onProgress);
}

// ── Init ───────────────────────────────────────────────────
document.getElementById('muteBtn').addEventListener('click', () => {
  setMuted(!muted);
  const v = scroller.children[activeIdx] && scroller.children[activeIdx].querySelector('video');
  if (v && v.paused) v.play().catch(() => {});
});
document.getElementById('uploadBtn').addEventListener('click', openUpload);
document.getElementById('emptyUploadBtn').addEventListener('click', openUpload);

(async () => {
  setMuted(true);
  initObserver();
  await loadMe();
  const id = parseInt(new URLSearchParams(location.search).get('id'));
  if (id) {
    try {
      const res = await fetch(`${API}/api/posts/${id}`, { headers: authHeaders() });
      if (res.ok) {
        const { post } = await res.json();
        if (post && /\.(mp4|mov|webm|m4v)(\?|$)/i.test(post.image_url || '')) {
          post.comments = post.comments || 0;
          reels.push(post); appendReel(post);
        }
      }
    } catch {}
  }
  await loadMore();
})();
