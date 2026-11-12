const CACHE = "diving-logbook-v1.7.3";
const SHELL = [
  "./index.html",
  "./styles.css?v=1.7.3",
  "./app.js?v=1.7.3",
  "./csv-import.js?v=1.7.3",
  "./settings-data-layout.js?v=1.7.3",
  "./service.js?v=1.7.3",
  "./manifest.webmanifest",
  "./version.json"
];

const ADDONS = [
  '<script src="./csv-import.js?v=1.7.3"></script>',
  '<script src="./settings-data-layout.js?v=1.7.3"></script>'
];

function withAddons(response) {
  if (!response || !response.ok) return response;

  return response.text().then(html => {
    let updated = html;
    for (const tag of ADDONS) {
      const src = tag.match(/src="([^"]+)"/)?.[1];
      if (src && !updated.includes(src)) {
        updated = /<\/body\s*>/i.test(updated)
          ? updated.replace(/<\/body\s*>/i, `${tag}</body>`)
          : `${updated}${tag}`;
      }
    }

    if (updated === html) return new Response(html, response);

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    headers.delete("etag");
    return new Response(updated, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  });
}

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (url.pathname.endsWith("/version.json")) {
    event.respondWith(fetch(event.request, { cache: "no-store" }).catch(() => caches.match("./version.json")));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(withAddons)
        .catch(() => caches.match("./index.html").then(withAddons))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(match => match || caches.match("./index.html")))
  );
});
