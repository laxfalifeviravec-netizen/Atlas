/* ============================================================
   One Culture — Service Worker
   Caches the app shell so it loads instantly and works offline.
   ============================================================ */

const CACHE = 'culture-v35';

const APP_SHELL = [
  '/',
  '/index.html',
  '/community.html',
  '/community.css',
  '/community.js',
  '/roads-catalog.html',
  '/roads-catalog.css',
  '/roads-catalog.js',
  '/chat.html',
  '/chat.css',
  '/chat.js',
  '/groups.html',
  '/groups.css',
  '/groups.js',
  '/shop.html',
  '/shop.css',
  '/shop.js',
  '/profile.html',
  '/profile.css',
  '/profile.js',
  '/roads.html',
  '/roads.css',
  '/roads.js',
  '/search.html',
  '/search.css',
  '/search.js',
  '/messages.html',
  '/messages.css',
  '/messages.js?v=3',
  '/events.html',
  '/events.css',
  '/events.js',
  '/following.html',
  '/following.js',
  '/marketplace.html',
  '/marketplace.css',
  '/marketplace.js',
  '/pricing.html',
  '/privacy.html',
  '/terms.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/lib/leaflet.js',
  '/lib/leaflet.css',
  '/create-sheet.js',
  '/photo-viewer.js',
  '/admin.html',
];

// Install — cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

// Activate — clear old caches, and reload open pages after an upgrade
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const stale = (await caches.keys()).filter(k => k !== CACHE);
    await Promise.all(stale.map(k => caches.delete(k)));
    await self.clients.claim();
    if (stale.length) {
      const wins = await self.clients.matchAll({ type: 'window' });
      wins.forEach(c => c.navigate(c.url).catch(() => {}));
    }
  })());
});

// Push notifications
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(self.registration.showNotification(data.title || 'One Culture', {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { type: data.type, post_id: data.post_id },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/community.html'));
});

// Fetch — serve from cache first, then network; always update cache for app shell
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET, API calls, and cross-origin requests — always go to network
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
