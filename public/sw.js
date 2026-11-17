const CACHE_NAME = "cashihan-pwa-v2";
const APP_PAGES = [
    "/login",
    "/offline",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(["/manifest.webmanifest", "/icon-192.png", "/icon-512.png", ...APP_PAGES]))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request).then((response) => {
                if (response.ok && APP_PAGES.includes(url.pathname)) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }
                return response;
            }).catch(async () => {
                const cache = await caches.open(CACHE_NAME);
                return (await cache.match(request)) || (await cache.match("/offline")) || Response.error();
            })
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => cached || fetch(request).then((response) => {
            if (response.ok && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icon-"))) {
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
        }))
    );
});
