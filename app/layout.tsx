import './globals.css';
import type { Metadata } from 'next';
import { Poppins, Cairo } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from '@/components/ui/sonner';
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider';

// ✅ ULTRA MODERN FONTS - خطوط عصرية 2024
// Poppins - الخط الأكثر عصرية للغة الإنجليزية
// نظيف، هندسي، احترافي، يستخدم في أفضل المواقع العصرية
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial']
});

// Cairo - أفضل خط عربي عصري من Google Fonts
// مصمم خصيصاً للغة العربية مع دعم ممتاز للاتينية
// يستخدم في أشهر المواقع العربية العصرية
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-cairo',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial']
});

// Get base URL from environment variable or use default
// In production, set NEXT_PUBLIC_APP_URL to your domain (e.g., https://benaaschool.ly)
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'مدرسة البناء العلمي - Madrasat Al-Binaa Al-Ilmi',
  description: 'نظام إدارة مدرسي متعدد اللغات مع التحكم في الوصول القائم على الأدوار - Multi-language school management system with role-based access',
  manifest: '/manifest.json',
  themeColor: '#15803d',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Benaa School',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Benaa School',
    title: 'مدرسة البناء العلمي | Benaa School',
    description: 'نظام إدارة مدرسي متعدد اللغات',
  },
  twitter: {
    card: 'summary',
    title: 'Benaa School',
    description: 'نظام إدارة مدرسي متعدد اللغات',
  },
  icons: {
    icon: '/icons/icon-144x144.png',
    apple: '/icons/icon-192x192.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${poppins.variable} ${cairo.variable} font-sans antialiased`}>
        <ServiceWorkerProvider>
          <LanguageProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </LanguageProvider>
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
