const CACHE = 'chroniques-v6.8.1-github-fixed';
const BASE = new URL('./', self.location.href);
const asset = path => new URL(path, BASE).href;
const ASSETS = [
  "index.html",
  "style.css",
  "app.js",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "manifest.webmanifest",
  "household-library.js",
  "household-task-library.v1.json",
  "assets/hero-guardian.webp",
  "assets/ritual-moon.webp",
  "assets/campaign-forge.webp",
  "assets/progression-banner.webp",
  "assets/sigil-pattern.svg",
  "assets/rune-divider.svg",
  "assets/protect-what-matters.webp",
  "assets/prepare-tomorrow.webp",
  "assets/builders-saga.webp",
  "assets/guardian-stage-1.webp",
  "assets/guardian-stage-10.webp",
  "assets/guardian-stage-20.webp",
  "assets/guardian-stage-30.webp",
  "assets/guardian-stage-40.webp",
  "assets/guardian-stage-50.webp"
].map(asset);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestURL = new URL(event.request.url);
  if (requestURL.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(asset('index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length) return list[0].focus();
      return clients.openWindow(asset('index.html'));
    })
  );
});
