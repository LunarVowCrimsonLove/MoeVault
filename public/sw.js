const CACHE_NAME = "moevault-v1"
const urlsToCache = ["/", "/login", "/dashboard", "/settings", "/manifest.json"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)))
})

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response
      }
      return fetch(event.request)
    }),
  )
})

// 推送通知支持
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "您有新的通知",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "查看详情",
        icon: "/icon-192.png",
      },
      {
        action: "close",
        title: "关闭",
        icon: "/icon-192.png",
      },
    ],
  }

  event.waitUntil(self.registration.showNotification("MoeVault", options))
})
