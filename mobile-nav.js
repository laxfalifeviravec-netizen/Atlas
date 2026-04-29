/* ============================================================
   Atlas — Mobile Bottom Navigation
   Injects bottom nav on small screens; highlights current page.
   ============================================================ */
(function () {
  const page = window.location.pathname.split('/').pop() || 'index.html';

  const nav = document.createElement('nav');
  nav.className = 'mobile-bottom-nav';
  nav.setAttribute('aria-label', 'Mobile navigation');
  nav.innerHTML = `
    <div class="mobile-bottom-nav-inner">
      <a class="mbn-item${page === 'index.html' || page === '' ? ' active' : ''}" href="index.html">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
          <polyline points="9 21 9 12 15 12 15 21"/>
        </svg>
        Home
      </a>
      <a class="mbn-item${page === 'map.html' ? ' active' : ''}" href="map.html">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
        Roads
      </a>
      <a class="mbn-item${page === 'community.html' ? ' active' : ''}" href="community.html">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        Community
      </a>
      <a class="mbn-item${page === 'profile.html' ? ' active' : ''}" href="${getProfileUrl()}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        Profile
      </a>
    </div>
  `;

  document.body.appendChild(nav);

  // Update profile link once user loads
  document.addEventListener('atlas:authchange', ({ detail: { user } }) => {
    const profileLink = nav.querySelector('a[href*="profile.html"]') ||
                        nav.querySelectorAll('.mbn-item')[3];
    if (profileLink && user) {
      profileLink.href = `profile.html?id=${user.id}`;
    }
  });

  function getProfileUrl() {
    // Will be updated once auth loads; placeholder for now
    return 'profile.html';
  }
})();
