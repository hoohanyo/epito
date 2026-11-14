// Építőkalkulátor service worker – az app offline is megnyílik
const CACHE = 'epitokalk-1.4';
const FILES = ['./', 'index.html', 'style.css?v=1.3', 'config.js?v=1.3', 'calc.js?v=1.3', 'app.js?v=1.3', 'szamologep.js?v=1.3', 'megrendeles.js?v=1.3', 'helyiseg.js?v=1.3', 'ajanlat.js?v=1.3', 'szamla.js?v=1.3', 'kuka.js?v=1.3', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // a Google API-t nem gyorsítótárazzuk
  // hálózat elsőként (mindig a friss verzió), offline esetén a tárolt fájl
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: false }).then(r => r || caches.match('index.html'))));
});
