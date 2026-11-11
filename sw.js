const CACHE_NAME = 'savepoint-v1';

// The site can live at any path (/<repo>/ on GitHub Pages, / on a custom domain), so every
// path here is relative to this file
const BASE = new URL('./', self.location).pathname;

const PRECACHE = [
  './',
  'index.html',
  'profile/ra/index.html',
  'profile/ra/app.js',
  'profile/ra/utils/constants.js',
  'profile/ra/utils/helpers.js',
  'profile/ra/utils/transform.js',
  'profile/steam/index.html',
  'profile/steam/app.js',
  'profile/steam/utils/constants.js',
  'profile/steam/utils/helpers.js',
  'profile/xbox/index.html',
  'profile/xbox/app.js',
  'profile/xbox/utils/constants.js',
  'profile/xbox/utils/helpers.js',
  'activity/index.html',
  'activity/app.js',
  'activity/utils/constants.js',
  'activity/utils/helpers.js',
  'activity/utils/normalizers.js',
  'analytics/index.html',
  'analytics/app.js',
  'analytics/utils.js',
  'completions/index.html',
  'completions/app.js',
  'changelog/index.html',
  'changelog/app.js',
  'assets/time.js',
  'assets/playing.js',
  'assets/motion.css',
  'assets/ui.css',
  'assets/sheet.js',
  'assets/game-view.js',
  'assets/tabs.js',
  'assets/avatar.png',
  'assets/icon-ra.png',
  'assets/icon-steam.png',
  'assets/icon-xbox.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
].map(p => new URL(p, self.location).href);

// Install — precache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate — delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch — network-first for JSON data, stale-while-revalidate for everything else
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;

  const isData = url.pathname.startsWith(BASE + 'data/') ||
                 url.pathname.startsWith(BASE + 'changelog.md');

  if (isData) {
    // Network-first: always try fresh data, fall back to cache if offline
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Stale-while-revalidate: serve the cached copy immediately and refresh it
    // in the background, so a deploy shows up on the next page load without a
    // CACHE_NAME bump. no-cache revalidates past GitHub Pages' HTTP cache.
    const network = fetch(event.request, { cache: 'no-cache' })
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return res;
      });
    event.respondWith(caches.match(event.request).then(cached => cached || network));
    event.waitUntil(network.catch(() => {}));
  }
});
