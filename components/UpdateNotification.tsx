'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { RefreshCw, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

interface UpdateInfo {
  available: boolean;
  version?: string;
  registration?: ServiceWorkerRegistration;
}

export function UpdateNotification() {
  const { t } = useLanguage();
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({ available: false });
  const [isUpdating, setIsUpdating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    // التحقق من Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // التحقق من التحديثات
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // هناك تحديث جديد متاح
                setUpdateInfo({
                  available: true,
                  registration: registration,
                });
              }
            });
          }
        });

        // التحقق من التحديثات بشكل دوري
        const updateInterval = setInterval(() => {
          registration.update();
        }, 60000); // كل دقيقة

        // تنظيف عند إلغاء التثبيت
        return () => clearInterval(updateInterval);
      });

      // الاستماع لرسائل Service Worker
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          setUpdateInfo({
            available: true,
            version: event.data.version,
          });
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      // الاستماع للأحداث المخصصة من useServiceWorker
      const handleUpdateAvailable = (event: CustomEvent) => {
        setUpdateInfo({
          available: true,
          registration: event.detail.registration,
        });
      };

      window.addEventListener('sw-update-available', handleUpdateAvailable as EventListener);

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
        window.removeEventListener('sw-update-available', handleUpdateAvailable as EventListener);
      };
    }
  }, [mounted]);

  const handleUpdate = async () => {
    if (!updateInfo.registration) return;

    setIsUpdating(true);

    try {
      // إرسال رسالة لـ Service Worker لتخطي الانتظار
      if (updateInfo.registration.waiting) {
        updateInfo.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // إعادة تحميل الصفحة بعد التحديث
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Error updating service worker:', error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setUpdateInfo({ available: false });
    // حفظ في localStorage لإخفاء الإشعار لمدة ساعة
    try {
      localStorage.setItem('pwa-update-dismissed', Date.now().toString());
    } catch (e) {
      // localStorage غير متاح
    }
  };

  // التحقق من إخفاء الإشعار
  useEffect(() => {
    if (!mounted) return;

    try {
      const dismissedTime = localStorage.getItem('pwa-update-dismissed');
      if (dismissedTime) {
        const dismissedDate = parseInt(dismissedTime);
        const oneHourAgo = Date.now() - 60 * 60 * 1000; // ساعة واحدة
        
        if (dismissedDate > oneHourAgo) {
          // تم إخفاء الإشعار مؤخراً، لا تظهره
          return;
        }
      }
    } catch (e) {
      // localStorage غير متاح
    }
  }, [mounted]);

  if (!mounted || !updateInfo.available) {
    return null;
  }

  return (
    <Dialog open={updateInfo.available} onOpenChange={(open) => {
      if (!open) {
        handleDismiss();
      }
    }}>
      <DialogContent className="sm:max-w-[500px] rtl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Download className="w-6 h-6 text-primary" />
            {t('updateAvailable')}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {t('updateAvailableDescription')}
          </DialogDescription>
        </DialogHeader>

        <Card className="border-primary/20 bg-primary/5 mt-4">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <RefreshCw className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">{t('whatsNew')}</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>{t('updateImprovements')}</li>
                    <li>{t('updateOfflineSupport')}</li>
                    <li>{t('updateBugFixes')}</li>
                  </ul>
                </div>
              </div>

              {updateInfo.version && (
                <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                  {t('updateVersion').replace('{version}', updateInfo.version)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleUpdate}
            className="flex-1 bg-primary hover:bg-primary/90"
            size="lg"
            disabled={isUpdating}
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                {t('updating')}
              </>
            ) : (
              <>
                <Download className="w-4 h-4 ml-2" />
                {t('updateNow')}
              </>
            )}
          </Button>
          <Button
            onClick={handleDismiss}
            variant="outline"
            className="flex-1"
            size="lg"
            disabled={isUpdating}
          >
            <X className="w-4 h-4 ml-2" />
            {t('updateLater')}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground pt-2">
          {t('updateReloadNote')}
        </p>
      </DialogContent>
    </Dialog>
  );
}

