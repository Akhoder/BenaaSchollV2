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
import { PWAMetaTags } from '@/components/PWAMetaTags';

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
    icon: [
      { url: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
    ],
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
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'مدرسة البناء العلمي',
    'mobile-web-app-capable': 'yes',
    'application-name': 'مدرسة البناء العلمي',
    'msapplication-TileColor': '#115E3C',
    'msapplication-config': '/browserconfig.xml',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="scroll-smooth">
      <body className="font-sans antialiased bg-background text-foreground">
        <PWAMetaTags />
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
