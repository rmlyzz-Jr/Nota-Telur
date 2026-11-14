/* Service worker: cache cangkang aplikasi agar bisa dibuka cepat & ter-install.
   Data nota (Apps Script) selalu diambil dari jaringan. */
var CACHE = 'nota-rpu-v2';
var ASET = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASET); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return; // API & logo: langsung jaringan
  e.respondWith(
    fetch(req).then(function (res) {
      var salin = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, salin); });
      return res;
    }).catch(function () { return caches.match(req).then(function (r) { return r || caches.match('./index.html'); }); })
  );
});
