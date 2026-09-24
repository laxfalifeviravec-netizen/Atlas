/* ============================================================
   One Culture — Service Worker
   Caches the app shell so it loads instantly and works offline.
   ============================================================ */

const CACHE = 'culture-v6';

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
  '/messages.js',
  '/events.html',
  '/events.css',
  '/events.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/lib/leaflet.js',
  '/lib/leaflet.css',
];

// Install — cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

// Activate — clear old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — serve from cache first, then network; always update cache for app shell
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET, API calls, and cross-origin requests — always go to network
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
      // Return cached immediately if available, update in background
      return cached || network;
    })
  );
});
