/* Service worker — offline app shell for the Singapore Mahjong Tutor.
 * Bump CACHE when any shell asset changes so clients pick up the new version. */
const CACHE = 'sgmj-v10';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './src/home.js',
  './src/engine.js',
  './src/app.js',
  './src/rules.js',
  './src/scorer.js',
  './src/value.js',
  './src/bonus.js',
  './src/bonus-app.js',
  './src/defense.js',
  './src/defense-app.js',
  './src/pushfold.js',
  './src/pushfold-app.js',
  './src/plan.js',
  './src/mc.js',
  './src/plan-app.js',
  './src/rules-editor.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first for same-origin GETs, self-healing, with an app-shell fallback.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
