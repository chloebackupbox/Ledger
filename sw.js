// 離線快取：改版時改 VER
var VER = 'ledger-3';
var FILES = ['./', 'index.html', 'app.js', 'manifest.webmanifest', 'hero.jpg', 'icons-a.webp', 'icons-b.webp', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VER).then(function (c) { return c.addAll(FILES); })); self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== VER; }).map(function (k) { return caches.delete(k); })); })); self.clients.claim(); });
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  // 網絡優先（有新版就用新版），冇網就用快取
  e.respondWith(fetch(e.request).then(function (r) { var cp = r.clone(); caches.open(VER).then(function (c) { c.put(e.request, cp); }); return r; }).catch(function () { return caches.match(e.request).then(function (m) { return m || caches.match('index.html'); }); }));
});
