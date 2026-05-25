// Rafa Paoli's Shooter Ultimate — Service Worker (Phase 2.5)
// Cache-first for the single-file game shell; network-fallback otherwise.

const CACHE = 'rafa-paoli-v3';
const SHELL = [
  './', './index.html',
  './js/01-bootstrap.js', './js/02-util.js', './js/03-fx-bullets.js',
  './js/04-player.js', './js/05-enemies-boss.js', './js/06-menu-ui.js',
  './js/07-online.js', './js/08-hud-lifecycle.js', './js/09-combat.js',
  './js/10-input-openworld.js', './js/11-gameloop-init.js',
  './js/12-expansion-systems.js', './js/13-expansion-modes.js',
  './js/14-expansion-extras.js', './js/15-expansion-tail.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Skip cross-origin (PeerJS CDN, etc.) — let the network handle it natively
  if (new URL(req.url).origin !== location.origin) return;

  e.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(resp => {
        if (resp && resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(req, clone)).catch(()=>{});
        }
        return resp;
      }).catch(() => cached || caches.match('./index.html'));
      return cached || fetchPromise;
    })
  );
});
