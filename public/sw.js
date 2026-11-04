// Közös Kosár – service worker: az alkalmazás héja offline is betölt.
// A Firestore adatforgalmat nem érinti (azt a Firebase saját offline gyorsítótára kezeli).
const CACHE = "kozos-kosar-v20";
const SHELL = ["./", "./index.html", "./app.js", "./parser.js", "./config.js", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];
const STATIC_HOSTS = ["www.gstatic.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // Hálózat először, hogy a frissítések azonnal megjelenjenek; offline a gyorsítótárból
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match("./index.html"))));
  } else if (STATIC_HOSTS.includes(url.hostname) && !url.pathname.includes("/channel")) {
    // Firebase SDK és betűtípusok: gyorsítótárból, háttérben frissítve
    e.respondWith(caches.match(req).then((cached) => {
      const net = fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; }).catch(() => cached);
      return cached || net;
    }));
  }
});
