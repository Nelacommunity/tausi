// Bump on any caching change: activate() deletes every other cache.
const CACHE = "tausi-v4";
const PRECACHE = ["/", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip cross-origin, Next.js HMR, and API requests
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  const offlineFallback = () =>
    caches.match("/offline").then((r) => r || caches.match("/"));

  // Network-first for navigation
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(offlineFallback));
    return;
  }

  // Cache-first only for immutable assets: hashed build output and static
  // files. Everything else — notably RSC page payloads (?_rsc=…) fetched on
  // client navigation — must go to the network, or users see stale pages.
  const immutable =
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?)$/.test(url.pathname);
  if (!immutable || url.searchParams.has("_rsc")) return;

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          if (!response || response.status >= 400) return response;

          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        }).catch(offlineFallback)
    )
  );
});
