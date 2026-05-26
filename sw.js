// Service Worker Luazul — Staff Login
// Mínimo para satisfacer el requisito de PWA installable en Android
// NO cachea otros paneles para evitar conflictos

var CACHE_NAME = 'luazul-staff-v1';

// Solo cacheamos el staff_login y sus assets propios
var STAFF_ONLY = [
  './',
  './staff_login.html',
  './manifest.json',
  './pwa_icons/icon_192.png',
  './pwa_icons/icon_512.png'
];

// Install: pre-cache del login
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STAFF_ONLY);
    })
  );
  self.skipWaiting();
});

// Activate: limpiar caches viejas
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: SOLO responder desde cache si es un recurso del staff login
// Los paneles internos (ceo, gerente, jefe, etc.) SIEMPRE van a network
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Ignorar completamente requests a Supabase (API y Storage)
  if (url.hostname.indexOf('supabase.co') !== -1) {
    return;
  }

  // Ignorar requests a otros orígenes (fonts, CDNs, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Solo cachear recursos del staff login
  var path = url.pathname;
  var isStaff = path.indexOf('staff_login') !== -1
    || path === '/'
    || path.indexOf('manifest') !== -1
    || path.indexOf('pwa_icons') !== -1
    || path.indexOf('sw.js') !== -1;

  if (isStaff) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request).then(function(response) {
          if (response && response.status === 200 && response.type === 'basic') {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      }).catch(function() {
        // Fallback offline: servir staff_login desde cache
        if (event.request.mode === 'navigate') {
          return caches.match('./staff_login.html');
        }
      })
    );
  }
  // Los demás requests (paneles, APIs) NO se cachean
});
