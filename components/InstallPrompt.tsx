'use client';

import { useState, useEffect } from 'react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useLanguage } from '@/contexts/LanguageContext';
import { X, Download, Smartphone, Share2, Menu, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export function InstallPrompt() {
  const { isInstallable, isInstalled, isIOS, isStandalone, promptInstall, hasPromptEvent } = useInstallPrompt();
  const { t } = useLanguage();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // تأكد من أن المكون تم تحميله على العميل
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      console.log('[PWA Install] Component not mounted yet');
      return;
    }

    console.log('[PWA Install] State check', { isInstalled, isStandalone, isInstallable, isIOS });

    // لا تظهر الرسالة إذا كان التطبيق مثبتاً بالفعل
    if (isInstalled || isStandalone) {
      console.log('[PWA Install] App already installed, not showing prompt');
      setShowPrompt(false);
      return;
    }

    // التحقق من localStorage إذا تم إخفاء الرسالة
    const dismissedKey = 'pwa-install-dismissed';
    let dismissedTime: string | null = null;
    try {
      dismissedTime = localStorage.getItem(dismissedKey);
    } catch (e) {
      // localStorage غير متاح (مثل وضع incognito)
    }

    const dismissedDate = dismissedTime ? new Date(dismissedTime) : null;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // ✅ FIX: إظهار الرسالة دائماً إذا لم يكن التطبيق مثبتاً
    // إظهار الرسالة إذا:
    // 1. لم يتم إخفاؤها من قبل
    // 2. أو مر أسبوع منذ آخر إخفاء
    // 3. أو على iOS (لإظهار التعليمات دائماً)
    // 4. أو إذا كان التطبيق قابل للتثبيت
    // 5. أو دائماً (للتأكد من إظهارها)
    const shouldShow = !dismissedTime || 
                      (dismissedDate && dismissedDate < oneWeekAgo) ||
                      isIOS ||
                      isInstallable ||
                      true; // ✅ FIX: إظهار دائماً للتأكد

    if (shouldShow) {
      console.log('[PWA Install] Will show prompt after delay');
      // ✅ FIX: تقليل الوقت لإظهار الرسالة بشكل أسرع
      const timer = setTimeout(() => {
        setShowPrompt(true);
        console.log('[PWA Install] ✅ Showing install prompt now!', { isInstallable, isIOS, isInstalled, isStandalone });
      }, 1000); // ✅ FIX: قللنا الوقت إلى ثانية واحدة

      return () => clearTimeout(timer);
    } else {
      setDismissed(true);
      console.log('[PWA Install] ❌ Not showing install prompt', { dismissedTime, shouldShow });
    }
  }, [mounted, isInstallable, isIOS, isInstalled, isStandalone]);

  const handleInstall = async () => {
    console.log('[PWA Install] Install button clicked', { 
      isIOS, 
      isInstallable, 
      hasPromptEvent,
      isStandalone,
      isInstalled 
    });
    
    if (isIOS) {
      // على iOS، نفتح التعليمات فقط (الرسالة مفتوحة بالفعل)
      // لا حاجة لفعل شيء
      console.log('[PWA Install] iOS device - showing instructions only');
      toast.info('اتبع التعليمات أعلاه لتثبيت التطبيق على iOS', {
        icon: <Smartphone className="w-4 h-4" />,
      });
      return;
    }
    
    // ✅ FIX: التحقق من وجود prompt event قبل المحاولة
    if (!hasPromptEvent) {
      console.log('[PWA Install] ⚠️ No prompt event available - showing manual instructions');
      toast.warning('التثبيت التلقائي غير متاح', {
        description: 'يرجى اتباع التعليمات أدناه لتثبيت التطبيق يدوياً',
        icon: <AlertCircle className="w-4 h-4" />,
        duration: 5000,
      });
      // إبقاء المودال مفتوحاً لإظهار التعليمات
      setShowPrompt(true);
      return;
    }
    
    // على Android/Chrome، نستخدم prompt
    try {
      console.log('[PWA Install] Attempting to prompt install...');
      const installed = await promptInstall();
      
      if (installed) {
        console.log('[PWA Install] ✅ Installation accepted by user');
        toast.success('جاري تثبيت التطبيق...', {
          icon: <Download className="w-4 h-4" />,
        });
        setShowPrompt(false);
      } else {
        console.log('[PWA Install] ⚠️ Installation dismissed by user');
        toast.info('تم إلغاء التثبيت', {
          description: 'يمكنك المحاولة مرة أخرى لاحقاً',
          icon: <X className="w-4 h-4" />,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('[PWA Install] ❌ Error during install:', error);
      // إظهار رسالة خطأ
      toast.error('حدث خطأ أثناء التثبيت', {
        description: 'يمكنك تثبيت التطبيق يدوياً من قائمة المتصفح',
        icon: <AlertCircle className="w-4 h-4" />,
        duration: 5000,
      });
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    try {
      localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    } catch (e) {
      // localStorage غير متاح
    }
  };

  // ✅ FIX: دالة لإظهار الرسالة يدوياً - تعمل دائماً
  const showManual = () => {
    console.log('PWA: Manual show requested', { isInstalled, isStandalone });
    setShowPrompt(true);
    setDismissed(false);
    // إزالة من localStorage لإجبار إظهار الرسالة
    try {
      localStorage.removeItem('pwa-install-dismissed');
    } catch (e) {
      // localStorage غير متاح
    }
  };

  // ✅ FIX: إظهار زر عائم دائماً (حتى لو كان التطبيق مثبتاً، يمكن للمستخدم رؤية التعليمات)
  // لا تظهر المودال إذا كان التطبيق مثبتاً بالفعل
  const shouldShowModal = !isInstalled && !isStandalone && mounted;
  
  // زر عائم لإظهار رسالة التثبيت يدوياً (يظهر دائماً إذا لم تكن الرسالة مفتوحة)
  const showFloatingButton = !showPrompt && mounted;

  return (
    <>
      {/* ✅ FIX: زر عائم لإظهار رسالة التثبيت - يظهر دائماً */}
      {showFloatingButton && (
        <Button
          onClick={showManual}
          className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-2xl z-50 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white border-2 border-white/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
          size="icon"
          aria-label="تثبيت التطبيق"
          title="تثبيت التطبيق"
        >
          <Download className="h-6 w-6" />
        </Button>
      )}

      {/* ✅ FIX: إظهار المودال فقط إذا لم يكن التطبيق مثبتاً */}
      {shouldShowModal && (
        <Dialog open={showPrompt} onOpenChange={(open) => {
        if (!open) {
          handleDismiss();
        }
      }}>
      <DialogContent className="sm:max-w-[500px] rtl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Download className="w-6 h-6 text-primary" />
            {t('installApp')}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {t('installAppDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isIOS ? (
            // تعليمات iOS
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" />
                  {t('installInstructionsIOS')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-semibold mb-1">{t('installStep1IOS')}</p>
                    <p className="text-muted-foreground">{t('installStep1IOSDesc')} <Share2 className="w-4 h-4 inline" /></p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-semibold mb-1">{t('installStep2IOS')}</p>
                    <p className="text-muted-foreground">{t('installStep2IOSDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-semibold mb-1">{t('installStep3IOS')}</p>
                    <p className="text-muted-foreground">{t('installStep3IOSDesc')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            // تعليمات Android/Chrome
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" />
                  {t('installInstructionsAndroid')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-semibold mb-1">{t('installStep1Android')}</p>
                    <p className="text-muted-foreground">{t('installStep1AndroidDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-semibold mb-1">{t('installStep2Android')}</p>
                    <p className="text-muted-foreground">{t('installStep2AndroidDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-semibold mb-1">{t('installStep3Android')}</p>
                    <p className="text-muted-foreground">{t('installStep3AndroidDesc')} <Menu className="w-4 h-4 inline" /></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2 pt-2">
            {!isIOS && (
              <Button
                onClick={handleInstall}
                className="flex-1 bg-primary hover:bg-primary/90"
                size="lg"
              >
                <Download className="w-4 h-4 ml-2" />
                {t('installNow')}
              </Button>
            )}
            <Button
              onClick={handleDismiss}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              <X className="w-4 h-4 ml-2" />
              {t('installLater')}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground pt-2">
            {t('installTip')}
          </p>
        </div>
      </DialogContent>
      </Dialog>
      )}
    </>
  );
}
