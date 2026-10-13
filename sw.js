// Service worker for Samurai: Last Stand — cache-first for the app shell so it
// installs as a real offline-capable PWA (required for a Play Store/TWA
// listing: Bubblewrap's Digital Asset Links check and Android's install
// criteria both expect a controlling service worker, not just a manifest).
//
// Bump CACHE_VERSION on every release so returning players actually get the
// new index.html instead of an old one served forever from cache.
const CACHE_VERSION = 'v3';
const CACHE_NAME = 'samurai-last-stand-' + CACHE_VERSION;
// manifest.json and the icons are real external files again (app stores
// require that, not inline base64), so they're back in the app shell.
// Screenshots aren't included — they're only ever read by the browser's
// install UI / store packaging tools, never fetched by the running game.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return; // don't try to cache cross-origin requests

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return res;
      }).catch(() => cached); // offline — fall back to whatever's cached, if anything
      // Cache-first: instant load from cache when available, and silently
      // refresh it in the background for next time.
      return cached || network;
    })
  );
});
