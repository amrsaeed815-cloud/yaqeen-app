
const CACHE_NAME = "yaqeen-v9";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",

  "./css/js/app.js",
  "./css/js/azkar.js",
  "./css/js/js/quran.js",
  "./css/js/js/js/timezone.js",

  "./prayer.js",
  "./ramadan.js",
  "./tasbeeh.js",
  "./qibla.js",
  "./duas.js",
  "./ruqyah.js",

  "./assets/icon-512 (1).png"
];

// تثبيت الملفات الأساسية
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// حذف النسخ القديمة
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key.startsWith("yaqeen-") && key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// التعامل مع الطلبات
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // عدم تخزين الملفات الخارجية
  if (url.origin !== self.location.origin) return;

  // صفحات التطبيق: الشبكة أولاً
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.status === 200) {
            event.waitUntil(
              caches.open(CACHE_NAME).then(cache =>
                cache.put("./index.html", response.clone())
              )
            );
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(cached =>
            cached || caches.match("./index.html")
          )
        )
    );
    return;
  }

  // ملفات JavaScript: الشبكة أولاً
  if (url.pathname.endsWith(".js")) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.status === 200) {
            event.waitUntil(
              caches.open(CACHE_NAME).then(cache =>
                cache.put(request, response.clone())
              )
            );
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(cached =>
            cached || new Response("تعذر تحميل الملف", {
              status: 503,
              headers: {
                "Content-Type": "text/plain; charset=utf-8"
              }
            })
          )
        )
    );
    return;
  }

  // باقي الملفات: الكاش أولاً
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (response.status === 200) {
          event.waitUntil(
            caches.open(CACHE_NAME).then(cache =>
              cache.put(request, response.clone())
            )
          );
        }
        return response;
      });
    })
  );
});
