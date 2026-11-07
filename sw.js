// Service worker: cache cangkang aplikasi (logo, ikon, halaman pembungkus).
// Aplikasi Apps Script tetap dimuat online.
var CACHE = 'nota-rpu-v1';
var ASET = ['./', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/logo.png'];

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
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // Apps Script: langsung ke jaringan
  e.respondWith(
    fetch(e.request).then(function (res) {
      var salin = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, salin); });
      return res;
    }).catch(function () { return caches.match(e.request); })
  );
});
