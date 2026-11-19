
"use strict";

const CACHE_NAME =yaqeen-v6

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./css/style.css",
  "./css/js/app.js",
  "./css/js/azkar.js",
  "./css/js/js/quran.js",
  "./css/js/js/js/timezone.js",
  "./prayer.js",
  "./ramadan.js",
  "./icon-192.png",
  "./icon-512.png"
];

// تثبيت الملفات الأساسية دون فشل التثبيت
// إذا كان أحد الملفات غير موجود
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        FILES_TO_CACHE.map((file) => cache.add(file))
      );
    })
  );

  self.skipWaiting();
});

// تفعيل النسخة الجديدة وحذف نسخ يقين القديمة
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) =>
            key.startsWith("yaqeen-") && key !== CACHE_NAME
          )
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// التعامل مع طلبات الملفات
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // عدم تخزين طلبات المواقع الخارجية وواجهات API
  if (url.origin !== self.location.origin) return;

  // صفحات التطبيق: الإنترنت أولاً ثم النسخة المحفوظة
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(
                new URL("./index.html", self.registration.scope),
                copy
              );
            });
          }

          return response;
        })
        .catch(async () => {
          const cached = await caches.match(
            new URL("./index.html", self.registration.scope)
          );

          return cached || Response.error();
        })
    );

    return;
  }

  // الملفات: النسخة المحفوظة أولاً ثم الإنترنت
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, copy);
          });
        }

        return response;
      });
    })
  );
});
