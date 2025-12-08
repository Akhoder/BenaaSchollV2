// Service Worker للتخزين المؤقت وتحسين الأداء
const VERSION = '2.0.0';
const CACHE_NAME = `benaa-school-v${VERSION}`;
const STATIC_CACHE_NAME = `benaa-school-static-v${VERSION}`;
const OFFLINE_PAGE = '/offline.html';
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB

// الملفات التي سيتم تخزينها مؤقتاً
const STATIC_FILES = [
  '/',
  '/dashboard',
  '/login',
  '/register',
  '/manifest.json',
  '/icons/icon-144x144.png',
  '/icons/icon-192x192.png',
  OFFLINE_PAGE
];

// API endpoints للتخزين المؤقت
const API_CACHE_PATTERNS = [
  /\/api\/profiles/,
  /\/api\/classes/,
  /\/api\/students/,
  /\/api\/stats/
];

// قائمة الطلبات الفاشلة لإعادة المحاولة
const FAILED_REQUESTS = [];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker version', VERSION);
  event.waitUntil(
    Promise.all([
      // تخزين الملفات الثابتة
      caches.open(STATIC_CACHE_NAME).then(async (cache) => {
        // addAll fails if any item 404s; add individually and ignore failures
        const cachePromises = STATIC_FILES.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'no-cache' });
            if (res.ok) {
              await cache.put(url, res.clone());
              console.log('[SW] Cached:', url);
            }
          } catch (error) {
            console.warn('[SW] Failed to cache:', url, error);
          }
        });
        await Promise.all(cachePromises);
        return true;
      }),
      // تفعيل Service Worker فوراً
      self.skipWaiting()
    ])
  );
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker version', VERSION);
  event.waitUntil(
    Promise.all([
      // تنظيف الذاكرة المؤقتة القديمة
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // السيطرة على جميع التبويبات
      self.clients.claim(),
      // إشعار جميع التبويبات بالتحديث
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: VERSION
          });
        });
      })
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

  // تجاهل طلبات POST/PUT/DELETE (لا نريد تخزينها مؤقتاً)
  if (request.method !== 'GET') {
    return;
  }

  // استراتيجية Cache First للملفات الثابتة
  if (isStaticFile(request.url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // استراتيجية Network First للـ API
  if (isApiRequest(request.url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // استراتيجية Stale While Revalidate للصفحات
  if (isPageRequest(request.url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // استراتيجية Network First للطلبات الأخرى
  event.respondWith(networkFirst(request));
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
      // التحقق من حجم الذاكرة المؤقتة قبل الإضافة
      if (await shouldCache(networkResponse.clone())) {
        await cache.put(request, networkResponse.clone());
      }
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    // إرجاع صفحة offline للصفحات
    if (isPageRequest(request.url)) {
      const offlinePage = await caches.match(OFFLINE_PAGE);
      if (offlinePage) {
        return offlinePage;
      }
    }
    return new Response('Offline', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// استراتيجية Network First
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      // التحقق من حجم الذاكرة المؤقتة قبل الإضافة
      if (await shouldCache(networkResponse.clone())) {
        await cache.put(request, networkResponse.clone());
      }
    }
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Network first failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // إرجاع صفحة offline للصفحات
    if (isPageRequest(request.url)) {
      const offlinePage = await caches.match(OFFLINE_PAGE);
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    // حفظ الطلب الفاشل لإعادة المحاولة لاحقاً
    if (request.url.startsWith(self.location.origin)) {
      FAILED_REQUESTS.push({
        url: request.url,
        timestamp: Date.now()
      });
    }
    
    return new Response('Offline', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// استراتيجية Stale While Revalidate
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      // التحقق من حجم الذاكرة المؤقتة قبل الإضافة
      if (shouldCache(networkResponse.clone())) {
        cache.put(request, networkResponse.clone());
      }
    }
    return networkResponse;
  }).catch((error) => {
    console.warn('[SW] Stale while revalidate failed:', error);
    // في حالة فشل الشبكة، إرجاع البيانات المخزنة مؤقتاً
    if (cachedResponse) {
      return cachedResponse;
    }
    // إرجاع صفحة offline للصفحات
    if (isPageRequest(request.url)) {
      return caches.match(OFFLINE_PAGE).then(offlinePage => {
        return offlinePage || new Response('Offline', { 
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
    }
    return new Response('Offline', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
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

// التحقق من حجم الذاكرة المؤقتة
async function shouldCache(response) {
  try {
    const clonedResponse = response.clone();
    const blob = await clonedResponse.blob();
    const size = blob.size;
    
    // التحقق من الحجم الإجمالي للذاكرة المؤقتة
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      for (const key of keys) {
        const cachedResponse = await cache.match(key);
        if (cachedResponse) {
          const cachedBlob = await cachedResponse.blob();
          totalSize += cachedBlob.size;
        }
      }
    }
    
    // السماح بالتخزين المؤقت إذا كان الحجم أقل من الحد الأقصى
    return (totalSize + size) < MAX_CACHE_SIZE;
  } catch (error) {
    console.warn('[SW] Error checking cache size:', error);
    return true; // السماح بالتخزين المؤقت في حالة الخطأ
  }
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
          cacheNames.map((cacheName) => {
            console.log('[SW] Clearing cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        // إشعار العميل بمسح الذاكرة المؤقتة
        event.ports && event.ports[0] && event.ports[0].postMessage({ success: true });
      })
    );
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports && event.ports[0] && event.ports[0].postMessage({ version: VERSION });
  }

  if (event.data && event.data.type === 'RETRY_FAILED_REQUESTS') {
    retryFailedRequests();
  }
});

// إعادة محاولة الطلبات الفاشلة
async function retryFailedRequests() {
  const requestsToRetry = FAILED_REQUESTS.splice(0, 10); // إعادة محاولة 10 طلبات في كل مرة
  
  for (const failedRequest of requestsToRetry) {
    try {
      const response = await fetch(failedRequest.url);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(failedRequest.url, response.clone());
        console.log('[SW] Retried and cached:', failedRequest.url);
      }
    } catch (error) {
      console.warn('[SW] Retry failed:', failedRequest.url, error);
      // إعادة إضافة الطلب للقائمة إذا فشل
      FAILED_REQUESTS.push(failedRequest);
    }
  }
}

// Background Sync (إذا كان متاحاً)
if ('sync' in self.registration) {
  self.addEventListener('sync', (event) => {
    if (event.tag === 'retry-failed-requests') {
      event.waitUntil(retryFailedRequests());
    }
  });
}

// Periodic Background Sync (إذا كان متاحاً)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'update-cache') {
      event.waitUntil(updateCache());
    }
  });
}

// تحديث الذاكرة المؤقتة
async function updateCache() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  
  for (const key of keys) {
    try {
      const response = await fetch(key);
      if (response.ok) {
        await cache.put(key, response.clone());
      }
    } catch (error) {
      console.warn('[SW] Failed to update cache for:', key, error);
    }
  }
}
