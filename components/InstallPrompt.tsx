'use client';

import { useState, useEffect } from 'react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
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
            تثبيت التطبيق
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            ثبّت تطبيق مدرسة البناء العلمي على جهازك للوصول السريع
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isIOS ? (
            // تعليمات iOS
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" />
                  تعليمات التثبيت على iPhone/iPad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-semibold mb-1">اضغط على زر المشاركة</p>
                    <p className="text-muted-foreground">في أسفل الشاشة (أيقونة <Share2 className="w-4 h-4 inline" />)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-semibold mb-1">اختر "إضافة إلى الشاشة الرئيسية"</p>
                    <p className="text-muted-foreground">أو "Add to Home Screen"</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-semibold mb-1">اضغط "إضافة"</p>
                    <p className="text-muted-foreground">سيظهر التطبيق على الشاشة الرئيسية</p>
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
                  تعليمات التثبيت على Android
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-semibold mb-1">اضغط على زر التثبيت أدناه</p>
                    <p className="text-muted-foreground">أو ابحث عن رسالة التثبيت في المتصفح</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-semibold mb-1">في Chrome: اضغط على القائمة</p>
                    <p className="text-muted-foreground">ثم اختر "تثبيت التطبيق" أو "Install app"</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-semibold mb-1">في Samsung Internet</p>
                    <p className="text-muted-foreground">اضغط على القائمة <Menu className="w-4 h-4 inline" /> ثم "إضافة إلى الشاشة الرئيسية"</p>
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
                تثبيت الآن
              </Button>
            )}
            <Button
              onClick={handleDismiss}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              <X className="w-4 h-4 ml-2" />
              لاحقاً
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground pt-2">
            💡 بعد التثبيت، يمكنك الوصول للتطبيق مباشرة من الشاشة الرئيسية
          </p>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
