// Minimal hand-rolled service worker: installability + faster repeat loads
// of static assets. Deliberately does NOT cache API responses or HTML
// navigations as a primary source — this is live business data (orders,
// stock, payments) that must never be served stale by default.

const CACHE_NAME = "stitchit-admin-shell-v1";
const APP_SHELL = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never intercept cross-origin (API) calls

  if (isStaticAsset(url)) {
    // Cache-first: static build assets are content-hashed and safe to cache aggressively.
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return res;
          })
      )
    );
    return;
  }

  // Network-first for everything else (HTML navigations, etc.) — only fall
  // back to cache if the network is genuinely unavailable.
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
