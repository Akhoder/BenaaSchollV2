'use client';

import { useEffect, useState, useCallback } from 'react';

interface ServiceWorkerState {
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  isOnline: boolean;
}

export function useServiceWorker() {
  const [swState, setSwState] = useState<ServiceWorkerState>({
    registration: null,
    updateAvailable: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });

  useEffect(() => {
    // ✅ DISABLE IN DEVELOPMENT: Service Worker causes build issues in dev mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      console.log('[SW] Service Worker disabled in development mode');
      // Unregister any existing service workers
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister();
          });
        });
      }
      return;
    }

    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;

    // تسجيل Service Worker
    navigator.serviceWorker
      .register('/sw.js', {
        updateViaCache: 'none', // دائماً التحقق من التحديثات
      })
      .then((reg) => {
        registration = reg;
        setSwState((prev) => ({ ...prev, registration: reg }));
        console.log('[SW] Service Worker registered successfully');

        // التحقق من التحديثات عند التسجيل
        checkForUpdates(reg);

        // الاستماع للتحديثات
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // هناك تحديث جديد متاح
                  console.log('[SW] New update available');
                  setSwState((prev) => ({ ...prev, updateAvailable: true }));
                  
                  // إرسال إشعار للمستخدم (سيتم التعامل معه في UpdateNotification)
                  window.dispatchEvent(new CustomEvent('sw-update-available', {
                    detail: { registration: reg }
                  }));
                } else {
                  // Service Worker جديد تم تثبيته لأول مرة
                  console.log('[SW] Service Worker installed for the first time');
                }
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('[SW] Service Worker registration failed:', error);
      });

    // معالجة رسائل Service Worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'CACHE_UPDATED') {
        console.log('[SW] Cache updated');
      }
      if (event.data && event.data.type === 'SW_UPDATED') {
        console.log('[SW] Service Worker updated to version:', event.data.version);
        setSwState((prev) => ({ 
          ...prev, 
          updateAvailable: true 
        }));
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    // التحقق من التحديثات بشكل دوري (كل 60 دقيقة)
    const updateInterval = setInterval(() => {
      if (registration) {
        checkForUpdates(registration);
      }
    }, 60 * 60 * 1000);

    // التحقق من حالة الاتصال
    const handleOnline = () => {
      setSwState((prev) => ({ ...prev, isOnline: true }));
      // إعادة محاولة الطلبات الفاشلة عند الاتصال
      if (registration && 'sync' in registration) {
        (registration as any).sync.register('retry-failed-requests').catch(() => {
          // Background sync غير متاح
        });
      }
    };

    const handleOffline = () => {
      setSwState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // تنظيف
    return () => {
      clearInterval(updateInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  return swState;
}

// التحقق من التحديثات
function checkForUpdates(registration: ServiceWorkerRegistration) {
  registration
    .update()
    .then(() => {
      console.log('[SW] Update check completed');
    })
    .catch((error) => {
      console.warn('[SW] Update check failed:', error);
    });
}

// دالة مساعدة لتخطي الانتظار وتطبيق التحديث
export const skipWaiting = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
};

// دالة مساعدة لمسح الذاكرة المؤقتة
export const clearCache = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    if (navigator.serviceWorker.controller) {
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.success || false);
        };

        navigator.serviceWorker.controller!.postMessage(
          { type: 'CLEAR_CACHE' },
          [messageChannel.port2]
        );

        // Timeout بعد 5 ثوان
        setTimeout(() => resolve(false), 5000);
      });
    }

    // إذا لم يكن هناك controller، مسح الذاكرة المؤقتة مباشرة
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    return true;
  } catch (error) {
    console.error('[SW] Error clearing cache:', error);
    return false;
  }
};

// دالة مساعدة للتحقق من حالة الاتصال
export const isOnline = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return true;
  return navigator.onLine;
};

// دالة مساعدة لإضافة مستمع لحالة الاتصال
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' && typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};
