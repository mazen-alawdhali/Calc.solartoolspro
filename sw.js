const CACHE_NAME = 'solar-calc-v16-cache';
const NETWORK_TIMEOUT_MS = 3000;

const urlsToCache = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/favicon.ico',
  '/favicon.svg',
  '/favicon-96x96.png',
  '/apple-touch-icon.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png'
];

// تنصيب التطبيق وتخزين الملفات في ذاكرة الجوال
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('تم حفظ الملفات للعمل أوفلاين بنجاح');
      return cache.addAll(urlsToCache);
    }).then(() => self.skipWaiting()) // إجبار المتصفح على تفعيل النسخة الجديدة فوراً دون انتظار
  );
});

// تفعيل السيرفيس وركر ومسح الكاش القديم تلقائياً
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('تم مسح الكاش القديم:', cacheName);
            return caches.delete(cacheName); // حذف الإصدارات القديمة
          }
        })
      );
    }).then(() => self.clients.claim()) // السيطرة المباشرة على كل النوافذ المفتوحة للتطبيق
  );
});

// استراتيجية Network-First مع مهلة 3 ثوانٍ والرجوع للكاش عند التأخير أو الأوفلاين
self.addEventListener('fetch', (event) => {
    // تتجاهل الطلبات الخارجية مثل APIs أو روابط تحليلات الزيارات
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        new Promise((resolve) => {
            let isTimedOut = false;

            // مؤقت المهلة (3 ثوانٍ)
            const timeoutId = setTimeout(() => {
                isTimedOut = true;
                caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        resolve(cachedResponse);
                    }
                });
            }, NETWORK_TIMEOUT_MS);

            // محاولة الجلب من الشبكة أولاً
            fetch(event.request).then((networkResponse) => {
                clearTimeout(timeoutId);

                // إذا نجح الاتصال وكانت الاستجابة سليمة، نحدث الكاش ونرجع الملف الجديد
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    if (!isTimedOut) {
                        resolve(networkResponse);
                    }
                } else {
                    // إذا أرجع السيرفر خطأ، نرجع النسخة المحفوظة من الكاش
                    if (!isTimedOut) {
                        caches.match(event.request).then((cachedResponse) => {
                            resolve(cachedResponse || networkResponse);
                        });
                    }
                }
            }).catch(() => {
                // في حالة انقطاع الشبكة (الأوفلاين) قبل انقضاء المهلة
                clearTimeout(timeoutId);
                if (!isTimedOut) {
                    caches.match(event.request).then((cachedResponse) => {
                        resolve(cachedResponse || new Response('Offline', { status: 503, statusText: 'Service Unavailable' }));
                    });
                }
            });
        })
    );
});

// استقبال أمر تخطي الانتظار من الشريط العائم لتفعيل التحديث فوراً عند النقر على "تحديث الآن"
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
