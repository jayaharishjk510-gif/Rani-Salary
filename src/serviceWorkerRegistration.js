// Service Worker unregistration helper for Rani Salary
// Purges all legacy Service Workers and CacheStorage to prevent white screen / stale chunk errors.

export function unregister() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((boolean) => {
          if (boolean) {
            console.log('[SW] Successfully unregistered legacy service worker:', registration.scope);
          }
        });
      }
    }).catch((error) => {
      console.warn('[SW] Error during service worker unregistration:', error.message);
    });
  }

  // Clear all CacheStorage stores
  if (typeof window !== 'undefined' && 'caches' in window) {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          console.log('[SW] Purging cache store:', name);
          return caches.delete(name);
        })
      );
    }).catch((err) => {
      console.warn('[SW] Error clearing cache stores:', err);
    });
  }
}

// Fallback register function that delegates directly to unregister to retire workers safely
export function register() {
  unregister();
}
