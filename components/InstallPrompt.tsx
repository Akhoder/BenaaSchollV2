'use client';

import { useState, useEffect } from 'react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useLanguage } from '@/contexts/LanguageContext';
import { X, Download, Smartphone, Share2, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function InstallPrompt() {
  const { isInstallable, isInstalled, isIOS, isStandalone, promptInstall } = useInstallPrompt();
  const { t } = useLanguage();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // تأكد من أن المكون تم تحميله على العميل
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // لا تظهر الرسالة إذا كان التطبيق مثبتاً بالفعل
    if (isInstalled || isStandalone) {
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

    // إظهار الرسالة إذا:
    // 1. لم يتم إخفاؤها من قبل
    // 2. أو مر أسبوع منذ آخر إخفاء
    // 3. أو على iOS (لإظهار التعليمات دائماً)
    // 4. أو إذا كان التطبيق قابل للتثبيت
    const shouldShow = !dismissedTime || 
                      (dismissedDate && dismissedDate < oneWeekAgo) ||
                      isIOS ||
                      isInstallable;

    if (shouldShow) {
      // تأخير بسيط لإظهار الرسالة بعد تحميل الصفحة
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000); // قللنا الوقت إلى ثانيتين

      return () => clearTimeout(timer);
    } else {
      setDismissed(true);
    }
  }, [mounted, isInstallable, isIOS, isInstalled, isStandalone]);

  const handleInstall = async () => {
    if (isIOS) {
      // على iOS، نفتح التعليمات فقط (الرسالة مفتوحة بالفعل)
      // لا حاجة لفعل شيء
    } else {
      // على Android/Chrome، نستخدم prompt
      const installed = await promptInstall();
      if (installed) {
        setShowPrompt(false);
      }
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

  // دالة لإظهار الرسالة يدوياً
  const showManual = () => {
    if (!isInstalled && !isStandalone) {
      setShowPrompt(true);
      setDismissed(false);
    }
  };

  // لا تظهر إذا لم يتم تحميل المكون أو كان مثبتاً
  if (!mounted || isInstalled || isStandalone) {
    return null;
  }

  // زر عائم لإظهار رسالة التثبيت يدوياً (يظهر فقط إذا لم تكن الرسالة مفتوحة)
  const showFloatingButton = !showPrompt && !dismissed;

  return (
    <>
      {/* زر عائم لإظهار رسالة التثبيت */}
      {showFloatingButton && (
        <Button
          onClick={showManual}
          className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-2xl z-50 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white border-2 border-white/20 transition-all duration-300"
          size="icon"
          aria-label="تثبيت التطبيق"
        >
          <Download className="h-6 w-6" />
        </Button>
      )}

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
    </>
  );
}
