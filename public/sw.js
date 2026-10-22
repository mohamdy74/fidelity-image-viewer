self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((windowClients) => {
        windowClients.forEach((client) => {
          if ("navigate" in client) client.navigate(client.url).catch(() => {});
        });
      })
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "DOWNFORCE F1", body: "Check the latest F1 action!" };
  if (event.data) {
    try { data = event.data.json(); } catch { data.body = event.data.text(); }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "DOWNFORCE", {
      body: data.body || "New telemetry update available.",
      icon: "/favicon.png",
      badge: "/favicon.png",
      data: { url: data.url || "/predict" }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/predict";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("downforce") && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
