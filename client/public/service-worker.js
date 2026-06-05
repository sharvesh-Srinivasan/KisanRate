/* KisanRate Service Worker — v2 (Offline-first price caching) */
const CACHE_NAME = "kisanrate-shell-v2";
const PRICES_CACHE = "kisanrate-prices-v1";

// App shell files to cache for offline use
const SHELL_URLS = ["/", "/index.html", "/manifest.json"];

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
            .filter((key) => key !== CACHE_NAME && key !== PRICES_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: smart strategy based on request type ───────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and socket requests
  if (request.method !== "GET" || request.url.includes("/socket.io/")) {
    return;
  }

  // ── Prices API: Network-first, cache fallback (with offline metadata) ──
  if (url.pathname.startsWith("/api/prices") || url.pathname.startsWith("/api/crops") || url.pathname.startsWith("/api/mandis")) {
    event.respondWith(networkFirstPrices(request));
    return;
  }

  // ── Navigation: serve SPA shell ──
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
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
    return;
  }

  // ── Everything else: cache-first ──
  event.respondWith(
    fetch(request)
      .then((response) => {
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

// ── Network-first for price API responses ─────────────────────────────────────
async function networkFirstPrices(request) {
  const cache = await caches.open(PRICES_CACHE);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Read body, enrich with cachedAt, store back
      const body = await networkResponse.json();
      const enriched = JSON.stringify({
        ...body,
        _cachedAt: new Date().toISOString()
      });
      const cachedResponse = new Response(enriched, {
        headers: {
          "Content-Type": "application/json",
          "X-KisanRate-Cached": "false"
        }
      });
      cache.put(request, cachedResponse);
      // Return original (not enriched) to app
      return new Response(JSON.stringify(body), {
        headers: { "Content-Type": "application/json" }
      });
    }
    return networkResponse;
  } catch {
    // Offline — try cached version
    const cached = await cache.match(request);
    if (cached) {
      const body = await cached.json();
      return new Response(JSON.stringify(body), {
        headers: {
          "Content-Type": "application/json",
          "X-KisanRate-Cached": "true",
          "X-KisanRate-CachedAt": body._cachedAt || ""
        }
      });
    }
    // No cache — return empty prices
    return new Response(
      JSON.stringify({ success: false, data: [], message: "Offline — no cached data available." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

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
