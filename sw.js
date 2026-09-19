const CACHE_NAME = 'stocker-shell-v1';
const APP_SHELL = [
  '/', '/home.html', '/login.html', '/index.html', '/sales.html', '/inventory.html',
  '/admin.html', '/feedback.html', '/billing.html', '/forgot-password.html', '/reset-password.html',
  '/css/stocker.css', '/css/marketing.css', '/client-config.js',
  '/js/api/client.js', '/js/api/offlineQueue.js', '/js/shared/ui.js', '/js/shared/layout.js',
  '/js/auth/guard.js', '/js/auth/login.js', '/js/dashboard/dashboard.js', '/js/sales/pos.js',
  '/js/inventory/inventory.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    if (!url.pathname.startsWith('/api/marketing/')) return;
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    }).catch(() => caches.match(request)));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match('/home.html'))));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => {
    const network = fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    });
    return cached || network;
  }));
});
