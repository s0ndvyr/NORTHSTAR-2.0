const CACHE_PREFIX = "northstar-shell-";
const CACHE_VERSION = "v1";
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;
const APP_SCOPE = self.registration.scope;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([
      new URL("./", APP_SCOPE).toString(),
      new URL("manifest.webmanifest", APP_SCOPE).toString(),
      new URL("northstar-icon.svg", APP_SCOPE).toString()
    ]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(new URL("./", APP_SCOPE).toString(), response.clone());
        }
        return response;
      } catch {
        return (await caches.match(new URL("./", APP_SCOPE).toString()))
          || new Response("NORTHSTAR is offline and the app shell is not available yet.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
      }
    })());
    return;
  }

  const isAppAsset = url.pathname.startsWith(new URL("./", APP_SCOPE).pathname)
    && /\.(?:js|css|svg|png|jpg|jpeg|webp|woff2?)$/i.test(url.pathname);
  if (isAppAsset) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
  }
});
