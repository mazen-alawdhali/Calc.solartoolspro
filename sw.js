const CACHE_NAME = 'solar-calc-v8-cache'; // تم تغيير الإصدار لـ v8 لإجبار المتصفح على التحديث
const urlsToCache = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/favicon.ico',
  '/favicon.svg',
  '/favicon-96x96.png',
  '/apple-touch-icon.png',
  '/web-app-manifest-192x192.png', // تمت إضافتها من المجلد لتعمل أوفلاين
  '/web-app-manifest-512x512.png'  // تمت إضافتها من المجلد لتعمل أوفلاين
];

// تنصيب التطبيق وتخزين الملفات في ذاكرة الجوال
self.addEventListener('install', event => {
  self.skipWaiting(); // إجبار المتصفح على تفعيل النسخة الجديدة فوراً دون انتظار
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('تم حفظ الملفات للعمل أوفلاين بنجاح');
        return cache.addAll(urlsToCache);
      })
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

// اعتراض الطلبات: استراتيجية "الإنترنت أولاً ثم الكاش" (Network First)
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // إذا كان هناك اتصال بالإنترنت، قم بتحديث الكاش بالنسخة الأحدث لضمان استمرار التحديثات
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // في حال انقطاع الإنترنت، قم بجلب النسخة من الكاش الموثوق
        return caches.match(event.request);
      })
  );
});

// استقبال أمر تخطي الانتظار من الشريط العائم لتفعيل التحديث فوراً عند النقر على "تحديث الآن"
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
