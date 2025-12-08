import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { BreadcrumbProvider } from '@/contexts/BreadcrumbContext';
import { Toaster } from '@/components/ui/sonner';
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider';
import { WebVitals } from '@/components/WebVitals';
import { FontLoader } from '@/components/FontLoader';
import { ErrorSuppressor } from '@/components/ErrorSuppressor';
import { InstallPrompt } from '@/components/InstallPrompt';
import { UpdateNotification } from '@/components/UpdateNotification';

// ✅ PERFORMANCE: Optimized font loading with preconnect
// Islamic Scholarly Fonts: Tajawal (body) + Amiri (headings) + Scheherazade (decorative)

// Get base URL from environment variable or use default
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://benaa-school.bolt.host';

export const viewport = {
  themeColor: '#115E3C', // Deep Islamic Emerald
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'مدرسة البناء العلمي | Madrasat Al-Binaa Al-Ilmi',
  description: 'مدرسة إسلامية لنشر العلوم الشرعية والتربوية - Islamic school for spreading religious and educational sciences',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'مدرسة البناء العلمي',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'مدرسة البناء العلمي',
    title: 'مدرسة البناء العلمي | Benaa Scientific School',
    description: 'مدرسة إسلامية لنشر العلوم الشرعية والتربوية',
    locale: 'ar_SA',
  },
  twitter: {
    card: 'summary',
    title: 'مدرسة البناء العلمي',
    description: 'مدرسة إسلامية لنشر العلوم الشرعية والتربوية',
  },
  icons: {
    icon: '/icons/icon-144x144.png',
    apple: '/icons/icon-192x192.png',
  },
  keywords: [
    'مدرسة البناء العلمي',
    'تعليم إسلامي',
    'علوم شرعية',
    'تربية إسلامية',
    'Islamic education',
    'Quran learning',
    'Islamic studies',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="scroll-smooth">
      <body className="font-sans antialiased bg-background text-foreground">
        <ErrorSuppressor />
        <FontLoader />
        <LanguageProvider>
          <ServiceWorkerProvider>
            <AuthProvider>
              <BreadcrumbProvider>
                {children}
                <Toaster />
                <WebVitals />
                <InstallPrompt />
                <UpdateNotification />
              </BreadcrumbProvider>
            </AuthProvider>
          </ServiceWorkerProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
