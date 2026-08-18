const cacheName = "luodian-shell-v0.7.0";

self.addEventListener("install", (event) => {
  const scope = self.registration.scope;
  event.waitUntil(
    caches.open(cacheName).then((cache) => cache.addAll([
      scope,
      `${scope}manifest.webmanifest`,
      `${scope}icons/icon-192.png`,
      `${scope}icons/icon-512.png`,
    ])),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("luodian-") && key !== cacheName).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(cacheName).then((cache) => cache.put(self.registration.scope, copy));
          return response;
        })
        .catch(() => caches.match(self.registration.scope)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(cacheName).then((cache) => cache.put(request, copy));
        }
        return response;
      });
      return cached ?? network;
    }),
  );
});
