'use client';

import { useEffect, useState } from 'react';

export function useServiceWorker() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // تسجيل Service Worker
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration);
          
          // التحقق من التحديثات
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // إشعار المستخدم بتحديث متاح
                  if (confirm('تحديث جديد متاح. هل تريد إعادة تحميل الصفحة؟')) {
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });

      // معالجة رسائل Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CACHE_UPDATED') {
          console.log('Cache updated');
        }
      });

      // تنظيف الذاكرة المؤقتة عند إغلاق التطبيق
      window.addEventListener('beforeunload', () => {
        navigator.serviceWorker.controller?.postMessage({
          type: 'CLEANUP'
        });
      });
    }
  }, []);
}

// دالة مساعدة لمسح الذاكرة المؤقتة
export const clearCache = async () => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_CACHE'
    });
  }
};

// دالة مساعدة للتحقق من حالة الاتصال
export const isOnline = () => {
  return navigator.onLine;
};

// دالة مساعدة لإضافة مستمع لحالة الاتصال
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
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
