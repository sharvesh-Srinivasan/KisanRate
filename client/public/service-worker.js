/* KisanRate Service Worker — v1 */
const CACHE_NAME = "kisanrate-shell-v1";

// App shell files to cache for offline use
const SHELL_URLS = ["/", "/index.html"];

// ── Install: cache the app shell ──────────────────────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: network-first with shell fallback ──────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET and API/socket requests — always go to network
  if (
    request.method !== "GET" ||
    request.url.includes("/api/") ||
    request.url.includes("/socket.io/")
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful HTML responses for offline shell
        if (response.ok && request.headers.get("accept")?.includes("text/html")) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(
          (cached) => cached || caches.match("/index.html")
        )
      )
  );
});

// ── Push: show notification ───────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "KisanRate", body: "New price update available.", url: "/" };

  try {
    data = event.data ? JSON.parse(event.data.text()) : data;
  } catch (_) {}

  const options = {
    body: data.body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: "kisanrate-price-alert",
    renotify: true,
    data: { url: data.url || "/" },
    actions: [{ action: "view", title: "View Prices" }]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Notification click: open or focus the app ─────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
