'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useServiceWorker, useOnlineStatus, clearCache as clearCacheHelper } from '@/hooks/useServiceWorker';

interface ServiceWorkerContextType {
  isOnline: boolean;
  isServiceWorkerReady: boolean;
  updateAvailable: boolean;
  clearCache: () => Promise<boolean>;
}

const ServiceWorkerContext = createContext<ServiceWorkerContextType | undefined>(undefined);

export function ServiceWorkerProvider({ children }: { children: ReactNode }) {
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);
  const isOnline = useOnlineStatus();
  const swState = useServiceWorker();

  useEffect(() => {
    // التحقق من حالة Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setIsServiceWorkerReady(true);
      });
    }
  }, []);

  const clearCache = async (): Promise<boolean> => {
    return await clearCacheHelper();
  };

  return (
    <ServiceWorkerContext.Provider value={{
      isOnline,
      isServiceWorkerReady,
      updateAvailable: swState.updateAvailable,
      clearCache
    }}>
      {children}
      {/* مؤشر حالة الاتصال */}
      {!isOnline && (
        <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg animate-in slide-in-from-top-5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">غير متصل - الوضع غير متصل</span>
          </div>
        </div>
      )}
      {/* مؤشر الاتصال عند العودة */}
      {isOnline && !isServiceWorkerReady && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-in slide-in-from-top-5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <span className="text-sm font-medium">متصل</span>
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
