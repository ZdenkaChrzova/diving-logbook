const CACHE = "diving-logbook-v1.3.1";
const SHELL = [
  "./index.html",
  "./styles.css?v=1.3.1",
  "./app.js?v=1.3.1",
  "./manifest.webmanifest",
  "./version.json"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});
self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.endsWith("/version.json")) {
    event.respondWith(fetch(event.request, {cache:"no-store"}).catch(() => caches.match("./version.json")));
    return;
  }
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request, {cache:"no-store"}).catch(() => caches.match("./index.html")));
    return;
  }
  event.respondWith(fetch(event.request).then(response => {const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(() => caches.match(event.request)));
});
