const CACHE_NAME = 'my-pwa-cache-v1';
const urlsToCache = [
  'index.html',
  'style.css',
  'script.js',
  'icons/401751295234.png',
  'icons/401751295182.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
