// Metrum – építőkalkulátor service worker – az app offline is megnyílik
const CACHE = 'epitokalk-2.22';
const FILES = ['./', 'index.html', 'style.css?v=2.22', 'config.js?v=2.22', 'ikonok.js?v=2.22', 'calc.js?v=2.22', 'cim.js?v=2.22', 'app.js?v=2.22', 'szamologep.js?v=2.22', 'megrendeles.js?v=2.22', 'helyiseg.js?v=2.22', 'ajanlat.js?v=2.22', 'kuldes.js?v=2.22', 'szamla.js?v=2.22', 'penzugy.js?v=2.22', 'kuka.js?v=2.22', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // a Google API-t nem gyorsítótárazzuk
  // hálózat elsőként (mindig a friss verzió), offline esetén a tárolt fájl
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: false }).then(r => r || caches.match('index.html'))));
});
