/*
 * Service Worker: hält die App vollständig offline verfügbar.
 *
 * Updates: Bei jeder Veröffentlichung VERSION erhöhen. Der Browser erkennt die
 * geänderte sw.js, lädt die neue Version komplett in einen eigenen Cache und
 * wartet. Die App zeigt dann „Jetzt aktualisieren“; erst nach dem Klick wird
 * die neue Version aktiv (Nachricht SKIP_WAITING). So werden alte und neue
 * Dateien nie gemischt.
 */
const VERSION = 'v54';
const CACHE = 'turnwettkampf-' + VERSION;
const ASSETS = [
  './',
  'index.html',
  'css/style.css',
  'js/config.js',
  'js/scoring.js',
  'js/crypto.js',
  'js/db.js',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/wtb-logo.png',
  'icons/geraete/boden.svg',
  'icons/geraete/pauschenpferd.svg',
  'icons/geraete/ringe.svg',
  'icons/geraete/sprung.svg',
  'icons/geraete/barren.svg',
  'icons/geraete/reck.svg'
];

self.addEventListener('install', (event) => {
  // HTTP-Cache umgehen, damit wirklich die neuen Dateien geladen werden.
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Nur aus dem Cache dieser Version liefern; fehlende Dateien aus dem Netz.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((cached) =>
        cached || fetch(req).catch(() => (req.mode === 'navigate' ? cache.match('index.html') : Response.error()))
      )
    )
  );
});
