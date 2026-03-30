var CACHE_NAME = 'aides-musique-v13';
var urlsToCache = [
  '/aides-musique-france/',
  '/aides-musique-france/index.html',
  '/aides-musique-france/aides.html',
  '/aides-musique-france/eligibilite.html',
  '/aides-musique-france/mentions-legales.html',
  '/aides-musique-france/favicon.svg',
  '/aides-musique-france/og-image.svg',
  '/aides-musique-france/manifest.json',
  '/aides-musique-france/dossier.html',
  '/aides-musique-france/404.html'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) {
        return response;
      }
      return fetch(event.request).then(function(response) {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        var responseToCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(function() {
        return caches.match('/aides-musique-france/index.html');
      });
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName !== CACHE_NAME;
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});
