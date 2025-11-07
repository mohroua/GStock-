const CACHE_NAME = 'hifz-companion-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    // أضف ملفات CSS/JS الخاصة بك إذا كانت منفصلة، ولكن هنا هي جزء من index.html
    // لذا، يتم التخزين المؤقت لـ index.html فقط لأجل ملفات النمط والسكريبت المُضمّنة.
];

// تثبيت عامل الخدمة (Service Worker) وفتح ذاكرة التخزين المؤقت
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// اعتراض طلبات جلب الموارد (Fetch)
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // إذا كان المورد موجودًا في ذاكرة التخزين المؤقت، فقم بإرجاعه
                if (response) {
                    return response;
                }
                // وإلا، قم بجلب المورد من الشبكة
                return fetch(event.request);
            })
    );
});

// تفعيل عامل الخدمة وحذف أي ذاكرة تخزين مؤقت قديمة
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        // حذف ذاكرة التخزين المؤقت غير المستخدمة
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
