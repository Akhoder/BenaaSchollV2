'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useServiceWorker, useOnlineStatus } from '@/hooks/useServiceWorker';

interface ServiceWorkerContextType {
  isOnline: boolean;
  isServiceWorkerReady: boolean;
  clearCache: () => Promise<void>;
}

const ServiceWorkerContext = createContext<ServiceWorkerContextType | undefined>(undefined);

export function ServiceWorkerProvider({ children }: { children: ReactNode }) {
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);
  const isOnline = useOnlineStatus();

  // تسجيل Service Worker
  useServiceWorker();

  useEffect(() => {
    // التحقق من حالة Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setIsServiceWorkerReady(true);
      });
    }
  }, []);

  const clearCache = async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_CACHE'
      });
    }
  };

  return (
    <ServiceWorkerContext.Provider value={{
      isOnline,
      isServiceWorkerReady,
      clearCache
    }}>
      {children}
      {/* مؤشر حالة الاتصال */}
      {!isOnline && (
        <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">غير متصل</span>
          </div>
        </div>
      )}
    </ServiceWorkerContext.Provider>
  );
}

export function useServiceWorkerContext() {
  const context = useContext(ServiceWorkerContext);
  if (context === undefined) {
    throw new Error('useServiceWorkerContext must be used within a ServiceWorkerProvider');
  }
  return context;
}
