// Közös Kosár – service worker: az alkalmazás héja offline is betölt.
// A Firestore adatforgalmat nem érinti (azt a Firebase saját offline gyorsítótára kezeli).
const CACHE = "kozos-kosar-v28";
const SHELL = ["./", "./index.html", "./app.js", "./parser.js", "./config.js", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];
const STATIC_HOSTS = ["www.gstatic.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Saját fájlok: azonnal a tárolt változatból indulunk (gyenge térerőnél is gyors), és a háttérben frissítjük.
// Új verziónál új service worker jön (más gyorsítótár-névvel), az app pedig frissítés-sávot mutat.
function cacheFirst(e, req) {
  const key = req.mode === "navigate" ? "./index.html" : req;
  const net = fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(key, copy)); }
    return res;
  });
  return caches.match(key).then((cached) => {
    if (cached) { e.waitUntil(net.catch(() => {})); return cached; }
    return net.catch(() => caches.match("./index.html"));
  });
}
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // Hálózat először, hogy a frissítések azonnal megjelenjenek; offline a gyorsítótárból
    if (url.pathname.endsWith("version.json") || req.cache === "no-store" || req.cache === "reload") {
      e.respondWith(fetch(req).catch(() => caches.match(req)));
      return;
    }
    e.respondWith(cacheFirst(e, req));
  } else if (STATIC_HOSTS.includes(url.hostname) && !url.pathname.includes("/channel")) {
    // Firebase SDK és betűtípusok: gyorsítótárból, háttérben frissítve
    e.respondWith(caches.match(req).then((cached) => {
      const net = fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; }).catch(() => cached);
      return cached || net;
    }));
  }
});
