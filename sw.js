/*
 * Service Worker: hält die App vollständig offline verfügbar.
 *
 * Updates: Bei jeder Veröffentlichung VERSION erhöhen. Der Browser erkennt die
 * geänderte sw.js, lädt die neue Version komplett in einen eigenen Cache und
 * wartet. Die App zeigt dann „Jetzt aktualisieren“; erst nach dem Klick wird
 * die neue Version aktiv (Nachricht SKIP_WAITING). So werden alte und neue
 * Dateien nie gemischt.
 */
const VERSION = 'v57';
const CACHE = 'turnwettkampf-' + VERSION;
// Fremde Bibliotheken (PDF für das iPhone) ändern sich praktisch nie: eigener Cache, der bei
// App-Updates erhalten bleibt und nur bei geänderter VENDOR-Nummer neu geladen wird.
const VENDOR = 'turnwettkampf-vendor-1';
const VENDOR_ASSETS = ['js/vendor/html2canvas.min.js', 'js/vendor/jspdf.umd.min.js'];
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
  event.waitUntil(Promise.all([
    caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))),
    caches.open(VENDOR).then((c) => Promise.all(VENDOR_ASSETS.map((u) => c.match(u).then((hit) => hit || c.add(u)))))
  ]));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== VENDOR).map((k) => caches.delete(k))))
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
      cache.match(req, { ignoreSearch: true }).then((cached) => cached || caches.open(VENDOR).then((v) => v.match(req, { ignoreSearch: true }))).then((cached) =>
        cached || fetch(req).catch(() => (req.mode === 'navigate' ? cache.match('index.html') : Response.error()))
      )
    )
  );
});
