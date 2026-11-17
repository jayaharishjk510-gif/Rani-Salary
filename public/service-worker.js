/* eslint-disable no-restricted-globals */

// Rani Salary - Self-Terminating Service Worker (Kill Switch)
// Unregisters itself and deletes all legacy caches to guarantee fresh network loads.

self.addEventListener('install', (event) => {
  // Activate immediately without waiting
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          console.log('[SW] Clearing cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => {
      console.log('[SW] Unregistering service worker...');
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Bypass all fetches: let the browser perform standard network requests natively
self.addEventListener('fetch', () => {
  // No-op: Do not intercept requests
});
