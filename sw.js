// Service Worker for AI Personal Tutor PWA
// Handles offline functionality and caching of app shell

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `ai-tutor-${CACHE_VERSION}`;

// App shell files to cache (only lightweight files, NOT the model)
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json'
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(APP_SHELL_FILES);
      })
      .then(() => {
        console.log('[Service Worker] App shell cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Cache failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activated successfully');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Don't cache WebLLM model files (they're huge ~2.4GB)
  // The browser's HTTP cache handles these efficiently
  if (url.pathname.includes('cdn.jsdelivr.net') || 
      url.pathname.includes('huggingface.co') ||
      request.url.includes('web-llm') ||
      request.url.includes('.wasm') ||
      request.url.includes('.bin') ||
      request.url.includes('model')) {
    // Let browser handle model files natively
    event.respondWith(
      fetch(request)
        .catch(() => {
          return new Response('Model files require network connection', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        })
    );
    return;
  }

  // For app shell files: Cache-first strategy
  if (APP_SHELL_FILES.some(file => url.pathname.endsWith(file) || url.pathname === file)) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            console.log('[Service Worker] Serving from cache:', request.url);
            return response;
          }
          
          // Not in cache, fetch from network
          return fetch(request)
            .then((networkResponse) => {
              // Cache the fetched file
              return caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, networkResponse.clone());
                  return networkResponse;
                });
            });
        })
        .catch(() => {
          // Offline and not cached - return offline page
          return new Response('Offline - App shell not available', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        })
    );
    return;
  }

  // For all other requests: Network-first strategy
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Optionally cache other resources
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request)
          .then((response) => {
            if (response) {
              return response;
            }
            return new Response('Offline - Resource not available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME)
      .then(() => {
        event.ports[0].postMessage({ success: true });
      });
  }
});

// Background sync for future enhancements
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  // Future: sync learning progress, export data, etc.
});

// Push notifications for future enhancements
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  // Future: study reminders, lesson notifications, etc.
});
