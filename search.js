/* ============================================================
   One Culture — Search Page JS
   ============================================================ */

const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001' : '';

const savedTheme = localStorage.getItem('culture-theme');
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
document.getElementById('themeToggle').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('culture-theme', next);
});

const input      = document.getElementById('searchInput');
const clearBtn   = document.getElementById('searchClear');
const placeholder= document.getElementById('searchPlaceholder');
const loading    = document.getElementById('searchLoading');
const results    = document.getElementById('searchResults');
const usersSection = document.getElementById('usersSection');
const usersList    = document.getElementById('usersList');
const postsSection = document.getElementById('postsSection');
const postsList    = document.getElementById('postsList');
const noResults    = document.getElementById('noResults');

let debounceTimer = null;

input.addEventListener('input', () => {
  const q = input.value.trim();
  clearBtn.style.display = q ? '' : 'none';
  if (!q) { showPlaceholder(); return; }
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => runSearch(q), 300);
});

clearBtn.addEventListener('click', () => {
  input.value = '';
  clearBtn.style.display = 'none';
  showPlaceholder();
  input.focus();
});

function showPlaceholder() {
  placeholder.style.display = '';
  loading.style.display = 'none';
  results.style.display = 'none';
}

async function runSearch(q) {
  placeholder.style.display = 'none';
  loading.style.display = 'flex';
  results.style.display = 'none';

  try {
    const res = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    renderResults(data);
  } catch {
    loading.style.display = 'none';
    results.style.display = '';
    noResults.style.display = '';
    usersSection.style.display = 'none';
    postsSection.style.display = 'none';
  }
}

function renderResults({ users = [], posts = [] }) {
  loading.style.display = 'none';
  results.style.display = '';

  const hasUsers = users.length > 0;
  const hasPosts = posts.length > 0;
  noResults.style.display = (!hasUsers && !hasPosts) ? '' : 'none';

  usersSection.style.display = hasUsers ? '' : 'none';
  if (hasUsers) {
    usersList.innerHTML = users.map(u => {
      const init = u.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
      const avatar = u.avatar
        ? `<img src="${esc(u.avatar)}" alt="" />`
        : init;
      return `
        <a href="profile.html?id=${u.id}" class="srch-user-row">
          <div class="srch-user-avatar">${avatar}</div>
          <div>
            <div class="srch-user-name">${esc(u.name)}</div>
            <div class="srch-user-plan">${esc(u.plan || 'Explorer')}</div>
          </div>
        </a>`;
    }).join('');
  }

  postsSection.style.display = hasPosts ? '' : 'none';
  if (hasPosts) {
    postsList.innerHTML = posts.map(p => {
      const imgSrc = p.image_url.startsWith('http') ? p.image_url : `${API}${p.image_url}`;
      return `
        <div class="srch-post-tile" data-id="${p.id}">
          <img src="${esc(imgSrc)}" alt="" loading="lazy" />
          <div class="srch-post-tile-overlay">
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            ${p.likes || 0}
          </div>
        </div>`;
    }).join('');

    postsList.querySelectorAll('.srch-post-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        location.href = `community.html?post=${tile.dataset.id}`;
      });
    });
  }
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
