const CACHE_NAME = "downforce-v2-cache";
const STATIC_ASSETS = ["/", "/offline.html", "/favicon.svg", "/favicon.png", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.pathname.startsWith("/api/") || url.hostname.includes("supabase.co") || url.hostname.includes("google.com")) return;

  if (url.pathname.startsWith("/assets/") || url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname.endsWith(".woff2") || url.pathname.endsWith(".png") || url.pathname.endsWith(".svg")) {
    e.respondWith(
      caches.match(req).then(cached => {
        if (cached) {
          fetch(req).then(res => { if (res && res.status === 200) caches.open(CACHE_NAME).then(c => c.put(req, res)); }).catch(() => {});
          return cached;
        }
        return fetch(req).then(res => {
          if (res && res.status === 200) { const cl = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, cl)); }
          return res;
        });
      })
    );
    return;
  }

  if (req.mode === "navigate") {
    e.respondWith(
      caches.match("/").then(cached => {
        const net = fetch(req).then(res => {
          if (res && res.status === 200) { const cl = res.clone(); caches.open(CACHE_NAME).then(c => c.put("/", cl)); }
          return res;
        }).catch(() => cached || caches.match("/offline.html"));
        return cached || net;
      })
    );
  }
});
