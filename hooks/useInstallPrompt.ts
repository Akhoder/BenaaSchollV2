'use client';

import { useEffect, useState, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasPromptEvent, setHasPromptEvent] = useState(false);
  const hasPromptEventRef = useRef(false); // ✅ FIX: استخدام ref لتتبع hasPromptEvent داخل timeout

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // ✅ DIAGNOSTICS: فحص شامل لشروط PWA
    const diagnostics = {
      isHTTPS: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
      hasServiceWorker: 'serviceWorker' in navigator,
      isDevelopment: process.env.NODE_ENV === 'development',
      userAgent: navigator.userAgent,
    };

    console.log('[PWA Diagnostics] Environment check:', diagnostics);

    // التحقق من نوع الجهاز
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                            (window.navigator as any).standalone === true;
    
    setIsIOS(isIOSDevice);
    setIsStandalone(isStandaloneMode);
    setIsInstalled(isStandaloneMode);

    // ✅ DIAGNOSTICS: فحص Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        console.log('[PWA Diagnostics] Service Worker registrations:', registrations.length);
        if (registrations.length === 0 && !diagnostics.isDevelopment) {
          console.warn('[PWA Diagnostics] ⚠️ No Service Worker registered - beforeinstallprompt may not fire');
        }
      });
    } else {
      console.warn('[PWA Diagnostics] ⚠️ Service Worker not supported in this browser');
    }

    // ✅ DIAGNOSTICS: فحص Manifest
    fetch('/manifest.json')
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        throw new Error('Manifest not found');
      })
      .then(manifest => {
        console.log('[PWA Diagnostics] ✅ Manifest found:', {
          name: manifest.name,
          short_name: manifest.short_name,
          icons: manifest.icons?.length || 0,
          display: manifest.display,
        });
        
        // التحقق من الأيقونات
        if (!manifest.icons || manifest.icons.length === 0) {
          console.warn('[PWA Diagnostics] ⚠️ No icons in manifest - beforeinstallprompt may not fire');
        }
      })
      .catch(err => {
        console.error('[PWA Diagnostics] ❌ Manifest check failed:', err);
      });

    // التحقق من قبل التثبيت (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
      setHasPromptEvent(true);
      hasPromptEventRef.current = true; // ✅ FIX: تحديث ref أيضاً
      console.log('[PWA Install Hook] ✅ beforeinstallprompt event received', {
        prompt: !!promptEvent.prompt,
        userChoice: !!promptEvent.userChoice,
      });
      console.log('[PWA Diagnostics] ✅ Install prompt is now available!');
    };

    // التحقق من التثبيت (بعد التثبيت)
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('PWA: App installed');
    };

    // التحقق من أن beforeinstallprompt متاح (قد لا يكون متاحاً في بعض الحالات)
    // على iOS لا يوجد beforeinstallprompt، لذلك نعتمد على isIOS
    if (!isIOSDevice) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      
      // ✅ DIAGNOSTICS: إضافة timeout للتحقق من عدم حدوث event
      const timeoutId = setTimeout(() => {
        if (!hasPromptEventRef.current) {
          console.warn('[PWA Diagnostics] ⚠️ beforeinstallprompt event did not fire after 5 seconds');
          console.warn('[PWA Diagnostics] Possible reasons:');
          console.warn('[PWA Diagnostics] 1. Running in development mode (localhost) - Service Worker is disabled');
          console.warn('[PWA Diagnostics] 2. Service Worker not registered - Check useServiceWorker hook');
          console.warn('[PWA Diagnostics] 3. App already installed - Check isStandalone/isInstalled');
          console.warn('[PWA Diagnostics] 4. User dismissed prompt before - Chrome remembers dismissals');
          console.warn('[PWA Diagnostics] 5. Browser does not support PWA installation');
          console.warn('[PWA Diagnostics] 6. Missing HTTPS (in production) - Required for PWA');
          console.warn('[PWA Diagnostics] 7. Manifest.json has errors - Check manifest validation');
          console.warn('[PWA Diagnostics] 8. Missing required icons (192x192, 512x512)');
          
          // فحص إضافي
          navigator.serviceWorker.getRegistrations().then((regs) => {
            console.log('[PWA Diagnostics] Service Worker registrations:', regs.length);
            if (regs.length === 0) {
              console.warn('[PWA Diagnostics] ⚠️ No Service Worker registered - This is required for beforeinstallprompt');
            }
          });
        }
      }, 5000);
      
      // تنظيف بعد 10 ثوانٍ
      setTimeout(() => {
        clearTimeout(timeoutId);
      }, 10000);
    } else {
      // على iOS، نعتبر التطبيق قابل للتثبيت دائماً (لإظهار التعليمات)
      setIsInstallable(true);
    }

    window.addEventListener('appinstalled', handleAppInstalled);

    // أيضاً، نتحقق من أن التطبيق قابل للتثبيت حتى لو لم يحدث beforeinstallprompt
    // (مثلاً في وضع التطوير أو إذا كانت بعض الشروط غير مستوفاة)
    // نعرض الرسالة دائماً على iOS أو إذا كان manifest موجود
    if (isIOSDevice) {
      setIsInstallable(true);
    } else {
      // ✅ FIX: تحقق من وجود manifest لتحديد إذا كان التطبيق قابل للتثبيت
      // حتى لو لم يحدث beforeinstallprompt (مثل وضع التطوير)
      fetch('/manifest.json')
        .then(res => {
          if (res.ok) {
            // Manifest موجود، التطبيق قابل للتثبيت
            setIsInstallable(true);
            console.log('PWA: Manifest found, app is installable');
          }
        })
        .catch(() => {
          // Manifest غير موجود، لكن نعرض الرسالة على أي حال
          setIsInstallable(true);
          console.log('PWA: Manifest check failed, but showing prompt anyway');
        });
    }

    return () => {
      if (!isIOSDevice) {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      }
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    console.log('[PWA Install Hook] promptInstall called', { deferredPrompt: !!deferredPrompt });
    
    if (!deferredPrompt) {
      console.warn('[PWA Install Hook] ⚠️ No deferred prompt available');
      console.warn('[PWA Install Hook] This usually means:');
      console.warn('[PWA Install Hook] 1. The app is already installed');
      console.warn('[PWA Install Hook] 2. The beforeinstallprompt event was not fired');
      console.warn('[PWA Install Hook] 3. The user dismissed the prompt before');
      console.warn('[PWA Install Hook] 4. The browser does not support PWA installation');
      
      // ✅ FIX: محاولة إعادة التحقق من beforeinstallprompt
      // في بعض الحالات، قد يكون event متأخراً
      const checkAgain = () => {
        // التحقق من أن manifest موجود
        fetch('/manifest.json')
          .then(res => {
            if (res.ok) {
              console.log('[PWA Install Hook] Manifest exists, but no prompt available');
              console.log('[PWA Install Hook] User should install manually from browser menu');
            }
          })
          .catch(err => {
            console.error('[PWA Install Hook] Error checking manifest:', err);
          });
      };
      
      checkAgain();
      return false;
    }

    try {
      console.log('[PWA Install Hook] Calling deferredPrompt.prompt()...');
      await deferredPrompt.prompt();
      
      console.log('[PWA Install Hook] Waiting for user choice...');
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log('[PWA Install Hook] User choice:', outcome);
      
      if (outcome === 'accepted') {
        console.log('[PWA Install Hook] ✅ User accepted installation');
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      } else {
        console.log('[PWA Install Hook] ❌ User dismissed installation');
        // إعادة تعيين deferredPrompt للسماح بمحاولة أخرى لاحقاً
        // (بعض المتصفحات تسمح بذلك)
        return false;
      }
    } catch (error) {
      console.error('[PWA Install Hook] ❌ Error prompting install:', error);
      console.error('[PWA Install Hook] Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      return false;
    }
  };

  return {
    isInstallable,
    isInstalled,
    isIOS,
    isStandalone,
    promptInstall,
    hasPromptEvent, // ✅ FIX: إضافة معلومات عن وجود prompt event
  };
}
