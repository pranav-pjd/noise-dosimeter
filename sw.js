// Service Worker for Noise Dosimeter PWA
// Implements offline-first caching strategy

const CACHE_VERSION = 'v2.0.0';
const CACHE_NAME = `noise-dosimeter-${CACHE_VERSION}`;

// Resources to cache for offline use
const STATIC_CACHE_URLS = [
  './',
  './index.html',
  './css/styles.css',
  './js/config.js',
  './js/core/audio-engine.js',
  './js/core/storage-engine.js',
  './js/core/dosimetry-engine.js',
  './js/sensors/proximity.js',
  './js/sensors/ambient-light.js',
  './js/ui/dose-circle.js',
  './js/ui/live-meter.js',
  './js/ui/charts.js',
  './js/ui/animations.js',
  './js/features/calibration.js',
  './js/features/warnings.js',
  './js/features/haptics.js',
  './js/features/privacy.js',
  './js/features/learn-more.js',
  './js/app.js',
  './manifest.json'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[ServiceWorker] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached response if available
        if (cachedResponse) {
          console.log('[ServiceWorker] Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // Otherwise fetch from network
        console.log('[ServiceWorker] Fetching from network:', event.request.url);
        return fetch(event.request)
          .then((networkResponse) => {
            // Optionally cache successful responses
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.error('[ServiceWorker] Fetch failed:', error);

            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }

            throw error;
          });
      })
  );
});

// Background sync for data export (future enhancement)
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);

  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Placeholder for future background sync functionality
      Promise.resolve()
    );
  }
});

// Push notification handler (future enhancement)
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'Noise exposure warning',
    icon: 'data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'90\'>🔊</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'90\'>🛡️</text></svg>',
    vibrate: [200, 100, 200],
    tag: 'noise-warning',
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification('Noise Dosimeter Alert', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked');
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});

console.log('[ServiceWorker] Script loaded');
