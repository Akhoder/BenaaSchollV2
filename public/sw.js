// Service Worker للتخزين المؤقت وتحسين الأداء
const CACHE_NAME = 'benaa-school-v1';
const STATIC_CACHE_NAME = 'benaa-school-static-v1';

// الملفات التي سيتم تخزينها مؤقتاً
const STATIC_FILES = [
  '/',
  '/dashboard',
  '/login',
  '/register',
  '/manifest.json',
  '/icons/icon-144x144.png'
];

// API endpoints للتخزين المؤقت
const API_CACHE_PATTERNS = [
  /\/api\/profiles/,
  /\/api\/classes/,
  /\/api\/students/,
  /\/api\/stats/
];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // تخزين الملفات الثابتة
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_FILES);
      }),
      // تفعيل Service Worker فوراً
      self.skipWaiting()
    ])
  );
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // تنظيف الذاكرة المؤقتة القديمة
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // السيطرة على جميع التبويبات
      self.clients.claim()
    ])
  );
});

// معالجة الطلبات
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل الطلبات غير HTTP/HTTPS
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // استراتيجية Cache First للملفات الثابتة
  if (request.method === 'GET' && isStaticFile(request.url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // استراتيجية Network First للـ API
  if (request.method === 'GET' && isApiRequest(request.url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // استراتيجية Stale While Revalidate للصفحات
  if (request.method === 'GET' && isPageRequest(request.url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});

// استراتيجية Cache First
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// استراتيجية Network First
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline', { status: 503 });
  }
}

// استراتيجية Stale While Revalidate
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // في حالة فشل الشبكة، إرجاع البيانات المخزنة مؤقتاً
    return cachedResponse || new Response('Offline', { status: 503 });
  });

  // إرجاع البيانات المخزنة مؤقتاً فوراً إذا كانت متوفرة
  return cachedResponse || fetchPromise;
}

// فحص ما إذا كان الملف ثابت
function isStaticFile(url) {
  return STATIC_FILES.some(file => url.includes(file)) ||
         url.includes('.js') ||
         url.includes('.css') ||
         url.includes('.png') ||
         url.includes('.jpg') ||
         url.includes('.jpeg') ||
         url.includes('.gif') ||
         url.includes('.svg') ||
         url.includes('.woff') ||
         url.includes('.woff2');
}

// فحص ما إذا كان طلب API
function isApiRequest(url) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url));
}

// فحص ما إذا كان طلب صفحة
function isPageRequest(url) {
  return url.includes('/dashboard') ||
         url.includes('/students') ||
         url.includes('/classes') ||
         url.includes('/users');
}

// معالجة رسائل الخلفية
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});
