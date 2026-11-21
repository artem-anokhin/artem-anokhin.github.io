// Minimal offline cache: network-first for pages, cache fallback offline.
const CACHE = "focusai-v3";
self.addEventListener("install", (e) => {
  const urls = ["/", "/focus/", "/breathe/", "/checkin/", "/test/", "/insights/", "/tree/", "/library/", "/manifest.webmanifest", "/icon.svg"];
  // Tolerant precache: one missing URL must not fail the whole install.
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(urls.map((u) => c.add(u)))));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () =>
        (await caches.match(req)) ||
        (await caches.match("/")) ||
        new Response("Нет соединения", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }),
      ),
  );
});
